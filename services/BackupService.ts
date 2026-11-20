import dayjs from 'dayjs'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type { ReadingTheme } from '@/config/theme'
import type { Locale } from '@/i18n'
import db from '@/services/DB'
import { fileAdapter } from '@/services/platform/fileAdapter'
import { SENTENCE_FORMAT_VERSION } from '@/services/SentenceService'
import { useBookmarkStore } from '@/store/useBookmarkStore'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useLLMStore } from '@/store/useLLMStore'
import { useOutputOptions } from '@/store/useOutputOptions'
import { useReadingProgressStore } from '@/store/useReadingProgress'
import { useSiderStore } from '@/store/useSiderStore'
import { type FontSize, useStyleStore } from '@/store/useStyleStore'
import { useTTSStore } from '@/store/useTTSStore'
import type { Book, Bookmark, ReadingProgress } from '@/types/book'
import type {
  LLMHistory,
  Model,
  OutputOption,
  PromptOption,
  Provider,
  ThinkingConfig,
  WordOption,
} from '@/types/llm'

export const BACKUP_FORMAT_VERSION = 1
export const BACKUP_APP_VERSION = '0.1.12'
export const BACKUP_MIME_TYPE = 'application/octet-stream'

export type BackupExportType = 'full' | 'book'
export type BackupConflictStrategy = 'skip' | 'overwrite'

export interface BackupManifest {
  formatVersion: number
  appVersion: string
  exportType: BackupExportType
  exportedAt: string
  includeApiKeys: boolean
  bookIds: string[]
}

export interface BackupLLMSettings {
  providers: Provider[]
  chatModel: Model | null
  parseModel: Model | null
  chatThinking: ThinkingConfig
  parseThinking: ThinkingConfig
  level?: number
}

export interface BackupOutputSettings {
  sentenceOptions: OutputOption[]
  promptOptions: PromptOption[]
  wordOptions: WordOption[]
  batchProcessingSize: number
  selectedId: string
  selectedWordId: string
}

export interface BackupStyleSettings {
  itemsPerRow?: number
  gutterX?: number
  gutterY?: number
  readingTheme: ReadingTheme
  themeInitialized: boolean
  useCustomTextColor: boolean
  lightModeTextColor: string
  darkModeTextColor: string
  headerCollapsed?: boolean
  language: Locale
  fontSize: FontSize
}

export interface BackupTTSSettings {
  ttsProvider: string
  ttsConfig: {
    system: {
      voiceType: string
      speedRatio: number
    }
    volcengine: {
      voiceType: string
      speedRatio: number
      appid: string
      token: string
    }
  }
  ttsGlobalConfig: {
    autoSentenceTTS: boolean
    autoWordTTS: boolean
  }
}

export interface BackupSettingsPayload {
  llm?: BackupLLMSettings
  outputOptions?: BackupOutputSettings
  style?: BackupStyleSettings
  tts?: BackupTTSSettings
}

export interface BackupDataSnapshot {
  books: Book[]
  progressList: ReadingProgress[]
  bookmarksByBook: Record<string, Bookmark[]>
  histories: LLMHistory[]
  settings: BackupSettingsPayload
}

export interface ParsedBackupArchive {
  manifest: BackupManifest
  books: Book[]
  progressList: ReadingProgress[]
  bookmarksByBook: Record<string, Bookmark[]>
  histories: LLMHistory[]
  settings: BackupSettingsPayload | null
}

export interface BackupInspectSummary {
  manifest: BackupManifest
  totalBooks: number
  newBookCount: number
  duplicateBookCount: number
  duplicateBookIds: string[]
  totalBookmarks: number
  totalHistories: number
  hasSettings: boolean
  includeApiKeys: boolean
  bookTitles: string[]
}

export interface BackupImportResult {
  importedBooks: number
  overwrittenBooks: number
  skippedBooks: number
  mergedBookmarks: number
  mergedHistories: number
  restoredSettings: boolean
  affectedBookIds: string[]
}

export interface BackupStorageDriver {
  getAllBooks: () => Promise<Book[]>
  putBookAndProgress: (book: Book, progress?: ReadingProgress | null) => Promise<void>
  getBookmarksByBook: () => Record<string, Bookmark[]>
  setBookmarksByBook: (next: Record<string, Bookmark[]>) => void
  getHistories: () => LLMHistory[]
  setHistories: (next: LLMHistory[], activeHistory?: LLMHistory | null) => void
  getActiveHistory: () => LLMHistory | null
  getSettings: () => BackupSettingsPayload
  applySettings: (next: BackupSettingsPayload) => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isZipBytes(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 4) return false
  return (
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)
  )
}

function parseJsonFile<T>(files: Record<string, Uint8Array>, path: string): T | null {
  const raw = files[path]
  if (!raw) return null
  try {
    return JSON.parse(strFromU8(raw)) as T
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Corrupted JSON in backup entry "${path}": ${msg}`)
  }
}

function redactProviders(providers: Provider[], includeApiKeys: boolean): Provider[] {
  return providers.map(provider => ({
    ...provider,
    apiKey: includeApiKeys ? provider.apiKey : '',
    models: provider.models.map(model => ({ ...model })),
  }))
}

function redactSettings(
  settings: BackupSettingsPayload,
  includeApiKeys: boolean
): BackupSettingsPayload {
  const copy: BackupSettingsPayload = {}

  if (settings.llm) {
    copy.llm = {
      ...settings.llm,
      providers: redactProviders(settings.llm.providers, includeApiKeys),
      chatModel: settings.llm.chatModel ? { ...settings.llm.chatModel } : null,
      parseModel: settings.llm.parseModel ? { ...settings.llm.parseModel } : null,
      chatThinking: { ...settings.llm.chatThinking },
      parseThinking: { ...settings.llm.parseThinking },
    }
  }

  if (settings.outputOptions) {
    copy.outputOptions = {
      ...settings.outputOptions,
      sentenceOptions: settings.outputOptions.sentenceOptions.map(item => ({ ...item })),
      promptOptions: settings.outputOptions.promptOptions.map(item => ({ ...item })),
      wordOptions: settings.outputOptions.wordOptions.map(item => ({ ...item })),
    }
  }

  if (settings.style) {
    copy.style = { ...settings.style }
  }

  if (settings.tts) {
    copy.tts = {
      ttsProvider: settings.tts.ttsProvider,
      ttsConfig: {
        system: { ...settings.tts.ttsConfig.system },
        volcengine: {
          ...settings.tts.ttsConfig.volcengine,
          appid: includeApiKeys ? settings.tts.ttsConfig.volcengine.appid : '',
          token: includeApiKeys ? settings.tts.ttsConfig.volcengine.token : '',
        },
      },
      ttsGlobalConfig: { ...settings.tts.ttsGlobalConfig },
    }
  }

  return copy
}

export function sanitizeArchiveFilename(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 64)
  return cleaned || 'book'
}

export function buildFullBackupArchive(
  snapshot: BackupDataSnapshot,
  options: { includeApiKeys: boolean; appVersion?: string; exportedAt?: string }
): Uint8Array {
  const manifest: BackupManifest = {
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: options.appVersion ?? BACKUP_APP_VERSION,
    exportType: 'full',
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    includeApiKeys: options.includeApiKeys,
    bookIds: snapshot.books.map(book => book.id),
  }

  const sanitizedSettings = redactSettings(snapshot.settings, options.includeApiKeys)
  const entries: Record<string, Uint8Array> = {
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
    'progress.json': strToU8(JSON.stringify(snapshot.progressList)),
    'bookmarks.json': strToU8(JSON.stringify(snapshot.bookmarksByBook)),
    'history.json': strToU8(JSON.stringify(snapshot.histories)),
    'settings.json': strToU8(JSON.stringify(sanitizedSettings)),
  }

  snapshot.books.forEach(book => {
    entries[`books/${book.id}.json`] = strToU8(JSON.stringify(book))
  })

  return zipSync(entries, { level: 6 })
}

export function buildSingleBookArchive(
  book: Book,
  progress: ReadingProgress | null,
  bookmarks: Bookmark[],
  options: { appVersion?: string; exportedAt?: string } = {}
): Uint8Array {
  const manifest: BackupManifest = {
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: options.appVersion ?? BACKUP_APP_VERSION,
    exportType: 'book',
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    includeApiKeys: false,
    bookIds: [book.id],
  }

  const entries: Record<string, Uint8Array> = {
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
    [`books/${book.id}.json`]: strToU8(JSON.stringify(book)),
    'progress.json': strToU8(JSON.stringify(progress ? [progress] : [])),
    'bookmarks.json': strToU8(JSON.stringify({ [book.id]: bookmarks })),
  }

  return zipSync(entries, { level: 6 })
}

function validateBookObject(value: unknown, entryName: string): Book {
  if (!isRecord(value)) {
    throw new Error(`Invalid book entry "${entryName}": expected object`)
  }
  if (typeof value.id !== 'string' || !value.id.trim()) {
    throw new Error(`Invalid book entry "${entryName}": missing book id`)
  }
  if (typeof value.title !== 'string') {
    throw new Error(`Invalid book entry "${entryName}": missing book title`)
  }
  if (!Array.isArray(value.chapterList)) {
    throw new Error(`Invalid book entry "${entryName}": missing chapterList`)
  }

  const rawBook = value as unknown as Book
  const toc = Array.isArray(rawBook.toc) && rawBook.toc.length > 0
    ? rawBook.toc
    : rawBook.chapterList.map((chapter, index) => ({
        title: chapter.title ?? `Chapter ${index + 1}`,
        index,
      }))

  return {
    ...rawBook,
    toc,
    metadata: isRecord(rawBook.metadata)
      ? {
          ...(rawBook.metadata as Book['metadata']),
          title: typeof rawBook.metadata.title === 'string' ? rawBook.metadata.title : rawBook.title,
          language: typeof rawBook.metadata.language === 'string' ? rawBook.metadata.language : 'en',
        }
      : { title: rawBook.title, language: 'en' },
  }
}

export function parseBackupArchive(bytes: Uint8Array): ParsedBackupArchive {
  if (!isZipBytes(bytes)) {
    throw new Error('Invalid backup archive: file is not a valid .rbk ZIP container')
  }

  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to unpack backup archive: ${msg}`)
  }

  const rawManifest = parseJsonFile<unknown>(files, 'manifest.json')
  if (!isRecord(rawManifest)) {
    throw new Error('Invalid backup archive: missing manifest.json')
  }
  if (rawManifest.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Unsupported backup formatVersion: ${String(rawManifest.formatVersion)}`
    )
  }
  if (rawManifest.exportType !== 'full' && rawManifest.exportType !== 'book') {
    throw new Error(`Invalid backup exportType: ${String(rawManifest.exportType)}`)
  }

  const manifest: BackupManifest = {
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: typeof rawManifest.appVersion === 'string' ? rawManifest.appVersion : '0.0.0',
    exportType: rawManifest.exportType,
    exportedAt: typeof rawManifest.exportedAt === 'string' ? rawManifest.exportedAt : '',
    includeApiKeys: Boolean(rawManifest.includeApiKeys),
    bookIds: Array.isArray(rawManifest.bookIds)
      ? rawManifest.bookIds.filter((id): id is string => typeof id === 'string')
      : [],
  }

  const bookPaths = Object.keys(files)
    .filter(path => path.startsWith('books/') && path.endsWith('.json'))
    .sort()

  const books = bookPaths.map(path => {
    const parsedBook = parseJsonFile<unknown>(files, path)
    return validateBookObject(parsedBook, path)
  })

  if (manifest.exportType === 'book' && books.length === 0) {
    throw new Error('Invalid single-book backup: no book data found')
  }

  const rawProgress = parseJsonFile<unknown>(files, 'progress.json')
  const progressList: ReadingProgress[] = Array.isArray(rawProgress)
    ? rawProgress.filter((item): item is ReadingProgress =>
        isRecord(item) && typeof item.bookId === 'string'
      )
    : []

  const rawBookmarks = parseJsonFile<unknown>(files, 'bookmarks.json')
  const bookmarksByBook: Record<string, Bookmark[]> = {}
  if (isRecord(rawBookmarks)) {
    Object.entries(rawBookmarks).forEach(([bookId, list]) => {
      if (Array.isArray(list)) {
        bookmarksByBook[bookId] = list.filter((bm): bm is Bookmark =>
          isRecord(bm) && typeof bm.sentence === 'string'
        )
      }
    })
  }

  const rawHistories = parseJsonFile<unknown>(files, 'history.json')
  const histories: LLMHistory[] = Array.isArray(rawHistories)
    ? rawHistories.filter((item): item is LLMHistory =>
        isRecord(item) && typeof item.id === 'string' && Array.isArray(item.messages)
      )
    : []

  const rawSettings = parseJsonFile<unknown>(files, 'settings.json')
  const settings: BackupSettingsPayload | null = isRecord(rawSettings)
    ? (rawSettings as BackupSettingsPayload)
    : null

  return {
    manifest,
    books,
    progressList,
    bookmarksByBook,
    histories,
    settings,
  }
}

export function inspectBackupArchive(
  parsedOrBytes: Uint8Array | ParsedBackupArchive,
  existingBooks: Array<Pick<Book, 'id' | 'fileHash'>>
): BackupInspectSummary {
  const parsed = parsedOrBytes instanceof Uint8Array
    ? parseBackupArchive(parsedOrBytes)
    : parsedOrBytes

  const existingIds = new Set(existingBooks.map(book => book.id))
  const existingHashes = new Set(
    existingBooks.map(book => book.fileHash).filter(hash => Boolean(hash && hash.trim()))
  )

  const duplicateBookIds: string[] = []
  parsed.books.forEach(book => {
    const matchedByHash = Boolean(book.fileHash && existingHashes.has(book.fileHash))
    const matchedById = existingIds.has(book.id)
    if (matchedByHash || matchedById) {
      duplicateBookIds.push(book.id)
    }
  })

  const totalBookmarks = Object.values(parsed.bookmarksByBook).reduce(
    (sum, list) => sum + list.length,
    0
  )

  return {
    manifest: parsed.manifest,
    totalBooks: parsed.books.length,
    newBookCount: parsed.books.length - duplicateBookIds.length,
    duplicateBookCount: duplicateBookIds.length,
    duplicateBookIds,
    totalBookmarks,
    totalHistories: parsed.histories.length,
    hasSettings: parsed.settings !== null,
    includeApiKeys: parsed.manifest.includeApiKeys,
    bookTitles: parsed.books.map(book => book.title),
  }
}

function mergeProviders(
  localProviders: Provider[],
  incomingProviders: Provider[],
  strategy: BackupConflictStrategy,
  archiveIncludedKeys: boolean
): Provider[] {
  const localMap = new Map(localProviders.map(p => [p.id, p]))
  const incomingMap = new Map(incomingProviders.map(p => [p.id, p]))
  const merged: Provider[] = []
  const seen = new Set<string>()

  incomingProviders.forEach(incoming => {
    seen.add(incoming.id)
    const local = localMap.get(incoming.id)
    if (!local) {
      merged.push({
        ...incoming,
        apiKey: archiveIncludedKeys ? incoming.apiKey : '',
      })
      return
    }

    const preservedKey =
      archiveIncludedKeys && incoming.apiKey
        ? incoming.apiKey
        : local.apiKey || incoming.apiKey || ''

    if (strategy === 'skip' && local.apiKey) {
      merged.push(local)
      return
    }

    merged.push({
      ...local,
      ...incoming,
      apiKey: preservedKey,
      models: incoming.models.length > 0 ? incoming.models : local.models,
    })
  })

  localProviders.forEach(local => {
    if (!seen.has(local.id) && !incomingMap.has(local.id)) {
      merged.push(local)
    }
  })

  return merged
}

function mergeById<T extends { id: string }>(
  localList: T[],
  incomingList: T[],
  strategy: BackupConflictStrategy
): T[] {
  if (strategy === 'overwrite' && incomingList.length > 0) {
    return incomingList
  }
  const existingIds = new Set(localList.map(item => item.id))
  const additions = incomingList.filter(item => !existingIds.has(item.id))
  return [...localList, ...additions]
}

function mergeSettingsPayload(
  localSettings: BackupSettingsPayload,
  incomingSettings: BackupSettingsPayload,
  strategy: BackupConflictStrategy,
  archiveIncludedKeys: boolean
): BackupSettingsPayload {
  const next: BackupSettingsPayload = { ...localSettings }

  if (incomingSettings.llm) {
    const localLlm = localSettings.llm
    const inLlm = incomingSettings.llm
    if (localLlm) {
      const mergedProviders = mergeProviders(
        localLlm.providers,
        inLlm.providers ?? [],
        strategy,
        archiveIncludedKeys
      )
      next.llm = {
        ...localLlm,
        providers: mergedProviders,
        chatModel: strategy === 'overwrite'
          ? (inLlm.chatModel ?? localLlm.chatModel)
          : (localLlm.chatModel ?? inLlm.chatModel ?? null),
        parseModel: strategy === 'overwrite'
          ? (inLlm.parseModel ?? localLlm.parseModel)
          : (localLlm.parseModel ?? inLlm.parseModel ?? null),
        chatThinking: strategy === 'overwrite'
          ? (inLlm.chatThinking ?? localLlm.chatThinking)
          : localLlm.chatThinking,
        parseThinking: strategy === 'overwrite'
          ? (inLlm.parseThinking ?? localLlm.parseThinking)
          : localLlm.parseThinking,
        level: strategy === 'overwrite' ? (inLlm.level ?? localLlm.level) : localLlm.level,
      }
    } else {
      next.llm = {
        ...inLlm,
        providers: redactProviders(inLlm.providers ?? [], archiveIncludedKeys),
      }
    }
  }

  if (incomingSettings.outputOptions) {
    const localOut = localSettings.outputOptions
    const inOut = incomingSettings.outputOptions
    if (localOut) {
      const sentenceOptions = mergeById(
        localOut.sentenceOptions,
        inOut.sentenceOptions ?? [],
        strategy
      )
      const promptOptions = mergeById(
        localOut.promptOptions,
        inOut.promptOptions ?? [],
        strategy
      )
      const wordOptions = mergeById(
        localOut.wordOptions,
        inOut.wordOptions ?? [],
        strategy
      )
      next.outputOptions = {
        sentenceOptions,
        promptOptions,
        wordOptions,
        batchProcessingSize:
          strategy === 'overwrite'
            ? (inOut.batchProcessingSize ?? localOut.batchProcessingSize)
            : localOut.batchProcessingSize,
        selectedId:
          strategy === 'overwrite'
            ? (inOut.selectedId || promptOptions[0]?.id || localOut.selectedId)
            : (localOut.selectedId || promptOptions[0]?.id || ''),
        selectedWordId:
          strategy === 'overwrite'
            ? (inOut.selectedWordId || wordOptions[0]?.id || localOut.selectedWordId)
            : (localOut.selectedWordId || wordOptions[0]?.id || ''),
      }
    } else {
      next.outputOptions = inOut
    }
  }

  if (incomingSettings.style) {
    const localStyle = localSettings.style
    const inStyle = incomingSettings.style
    if (!localStyle || strategy === 'overwrite' || !localStyle.themeInitialized) {
      next.style = {
        ...localStyle,
        ...inStyle,
      }
    }
  }

  if (incomingSettings.tts) {
    const localTts = localSettings.tts
    const inTts = incomingSettings.tts
    if (!localTts) {
      next.tts = inTts
    } else if (strategy === 'overwrite') {
      next.tts = {
        ttsProvider: inTts.ttsProvider || localTts.ttsProvider,
        ttsGlobalConfig: inTts.ttsGlobalConfig ?? localTts.ttsGlobalConfig,
        ttsConfig: {
          system: inTts.ttsConfig?.system ?? localTts.ttsConfig.system,
          volcengine: {
            ...localTts.ttsConfig.volcengine,
            ...(inTts.ttsConfig?.volcengine ?? {}),
            appid:
              archiveIncludedKeys && inTts.ttsConfig?.volcengine?.appid
                ? inTts.ttsConfig.volcengine.appid
                : localTts.ttsConfig.volcengine.appid ||
                  inTts.ttsConfig?.volcengine?.appid ||
                  '',
            token:
              archiveIncludedKeys && inTts.ttsConfig?.volcengine?.token
                ? inTts.ttsConfig.volcengine.token
                : localTts.ttsConfig.volcengine.token ||
                  inTts.ttsConfig?.volcengine?.token ||
                  '',
          },
        },
      }
    } else {
      next.tts = {
        ...localTts,
        ttsConfig: {
          ...localTts.ttsConfig,
          volcengine: {
            ...localTts.ttsConfig.volcengine,
            appid:
              localTts.ttsConfig.volcengine.appid ||
              (archiveIncludedKeys ? inTts.ttsConfig?.volcengine?.appid || '' : ''),
            token:
              localTts.ttsConfig.volcengine.token ||
              (archiveIncludedKeys ? inTts.ttsConfig?.volcengine?.token || '' : ''),
          },
        },
      }
    }
  }

  return next
}

export async function applyBackupArchive(
  parsed: ParsedBackupArchive,
  strategy: BackupConflictStrategy,
  driver: BackupStorageDriver
): Promise<BackupImportResult> {
  const existingBooks = await driver.getAllBooks()
  const existingById = new Map(existingBooks.map(book => [book.id, book]))
  const existingByHash = new Map(
    existingBooks
      .filter(book => Boolean(book.fileHash && book.fileHash.trim()))
      .map(book => [book.fileHash, book])
  )

  const progressByBookId = new Map(
    parsed.progressList.map(progress => [progress.bookId, progress])
  )
  const bookIdRemap = new Map<string, string>()

  let importedBooks = 0
  let overwrittenBooks = 0
  let skippedBooks = 0
  const affectedBookIds: string[] = []

  for (const incomingBook of parsed.books) {
    const matched =
      (incomingBook.fileHash ? existingByHash.get(incomingBook.fileHash) : undefined) ??
      existingById.get(incomingBook.id)

    const targetBookId = matched ? matched.id : incomingBook.id
    bookIdRemap.set(incomingBook.id, targetBookId)

    const incomingProgress = progressByBookId.get(incomingBook.id)
    const normalizedProgress: ReadingProgress | null = incomingProgress
      ? {
          ...incomingProgress,
          bookId: targetBookId,
          sentenceFormatVersion:
            incomingProgress.sentenceFormatVersion ?? SENTENCE_FORMAT_VERSION,
        }
      : null

    if (!matched) {
      await driver.putBookAndProgress(incomingBook, normalizedProgress)
      importedBooks += 1
      affectedBookIds.push(targetBookId)
    } else if (strategy === 'overwrite') {
      await driver.putBookAndProgress(
        { ...incomingBook, id: targetBookId },
        normalizedProgress
      )
      overwrittenBooks += 1
      affectedBookIds.push(targetBookId)
    } else {
      skippedBooks += 1
    }
  }

  const nextBookmarksByBook: Record<string, Bookmark[]> = { ...driver.getBookmarksByBook() }
  let mergedBookmarks = 0

  Object.entries(parsed.bookmarksByBook).forEach(([rawBookId, incomingList]) => {
    const targetBookId = bookIdRemap.get(rawBookId) ?? rawBookId
    const currentList = [...(nextBookmarksByBook[targetBookId] ?? [])]
    const seenIds = new Set(currentList.map(item => item.id))
    const seenKeys = new Set(
      currentList.map(item => `${item.chapterIndex}::${item.lineIndex}::${item.sentence}`)
    )

    incomingList.forEach(item => {
      const dedupeKey = `${item.chapterIndex}::${item.lineIndex}::${item.sentence}`
      if (seenIds.has(item.id) || seenKeys.has(dedupeKey)) {
        return
      }
      seenIds.add(item.id)
      seenKeys.add(dedupeKey)
      currentList.push({
        ...item,
        bookId: targetBookId,
      })
      mergedBookmarks += 1
    })

    if (currentList.length > 0) {
      nextBookmarksByBook[targetBookId] = currentList
    }
  })
  driver.setBookmarksByBook(nextBookmarksByBook)

  let mergedHistories = 0
  if (parsed.manifest.exportType === 'full' && parsed.histories.length > 0) {
    const localHistories = driver.getHistories()
    const historyMap = new Map(localHistories.map(item => [item.id, item]))
    const activeHistory = driver.getActiveHistory()
    let nextActiveHistory = activeHistory

    parsed.histories.forEach(incomingHistory => {
      const exists = historyMap.has(incomingHistory.id)
      if (!exists || strategy === 'overwrite') {
        historyMap.set(incomingHistory.id, incomingHistory)
        if (!exists || strategy === 'overwrite') {
          mergedHistories += 1
        }
        if (nextActiveHistory && nextActiveHistory.id === incomingHistory.id && strategy === 'overwrite') {
          nextActiveHistory = incomingHistory
        }
      }
    })

    driver.setHistories(Array.from(historyMap.values()), nextActiveHistory)
  }

  let restoredSettings = false
  if (parsed.manifest.exportType === 'full' && parsed.settings) {
    const mergedSettings = mergeSettingsPayload(
      driver.getSettings(),
      parsed.settings,
      strategy,
      parsed.manifest.includeApiKeys
    )
    driver.applySettings(mergedSettings)
    restoredSettings = true
  }

  return {
    importedBooks,
    overwrittenBooks,
    skippedBooks,
    mergedBookmarks,
    mergedHistories,
    restoredSettings,
    affectedBookIds,
  }
}

export function createAppBackupDriver(): BackupStorageDriver {
  return {
    getAllBooks: () => db.getAllBooks(false),
    putBookAndProgress: (book, progress) => db.putBookAndProgress(book, progress),
    getBookmarksByBook: () => useBookmarkStore.getState().bookmarksByBook,
    setBookmarksByBook: next => useBookmarkStore.setState({ bookmarksByBook: next }),
    getHistories: () => useHistoryStore.getState().historys,
    setHistories: (next, activeHistory) =>
      useHistoryStore.setState({
        historys: next,
        ...(activeHistory !== undefined ? { history: activeHistory } : {}),
      }),
    getActiveHistory: () => useHistoryStore.getState().history,
    getSettings: () => {
      const llm = useLLMStore.getState()
      const output = useOutputOptions.getState()
      const style = useStyleStore.getState()
      const tts = useTTSStore.getState()
      return {
        llm: {
          providers: llm.providers,
          chatModel: llm.chatModel,
          parseModel: llm.parseModel,
          chatThinking: llm.chatThinking,
          parseThinking: llm.parseThinking,
          level: llm.level,
        },
        outputOptions: {
          sentenceOptions: output.sentenceOptions,
          promptOptions: output.promptOptions,
          wordOptions: output.wordOptions,
          batchProcessingSize: output.batchProcessingSize,
          selectedId: output.selectedId,
          selectedWordId: output.selectedWordId,
        },
        style: {
          itemsPerRow: style.itemsPerRow,
          gutterX: style.gutterX,
          gutterY: style.gutterY,
          readingTheme: style.readingTheme,
          themeInitialized: style.themeInitialized,
          useCustomTextColor: style.useCustomTextColor,
          lightModeTextColor: style.lightModeTextColor,
          darkModeTextColor: style.darkModeTextColor,
          headerCollapsed: style.headerCollapsed,
          language: style.language,
          fontSize: style.fontSize,
        },
        tts: {
          ttsProvider: tts.ttsProvider,
          ttsConfig: tts.ttsConfig,
          ttsGlobalConfig: tts.ttsGlobalConfig,
        },
      }
    },
    applySettings: next => {
      if (next.llm) {
        useLLMStore.setState({
          providers: next.llm.providers,
          chatModel: next.llm.chatModel,
          parseModel: next.llm.parseModel,
          chatThinking: next.llm.chatThinking,
          parseThinking: next.llm.parseThinking,
          ...(next.llm.level !== undefined ? { level: next.llm.level } : {}),
        })
      }
      if (next.outputOptions) {
        useOutputOptions.setState({
          sentenceOptions: next.outputOptions.sentenceOptions,
          promptOptions: next.outputOptions.promptOptions,
          wordOptions: next.outputOptions.wordOptions,
          batchProcessingSize: next.outputOptions.batchProcessingSize,
          selectedId: next.outputOptions.selectedId,
          selectedWordId: next.outputOptions.selectedWordId,
        })
      }
      if (next.style) {
        useStyleStore.setState({
          ...(next.style.itemsPerRow !== undefined ? { itemsPerRow: next.style.itemsPerRow } : {}),
          ...(next.style.gutterX !== undefined ? { gutterX: next.style.gutterX } : {}),
          ...(next.style.gutterY !== undefined ? { gutterY: next.style.gutterY } : {}),
          readingTheme: next.style.readingTheme,
          themeInitialized: next.style.themeInitialized,
          useCustomTextColor: next.style.useCustomTextColor,
          lightModeTextColor: next.style.lightModeTextColor,
          darkModeTextColor: next.style.darkModeTextColor,
          ...(next.style.headerCollapsed !== undefined ? { headerCollapsed: next.style.headerCollapsed } : {}),
          language: next.style.language,
          fontSize: next.style.fontSize,
        })
      }
      if (next.tts) {
        useTTSStore.setState({
          ttsProvider: next.tts.ttsProvider,
          ttsConfig: next.tts.ttsConfig,
          ttsGlobalConfig: next.tts.ttsGlobalConfig,
        })
      }
    },
  }
}

export async function exportFullBackup(options: {
  includeApiKeys: boolean
}): Promise<{ saved: boolean; filename: string; bookCount: number }> {
  const driver = createAppBackupDriver()
  const books = await driver.getAllBooks()
  const progressList = await db.getAllReadingProgress()
  const bookmarksByBook = driver.getBookmarksByBook()
  const histories = driver.getHistories()
  const settings = driver.getSettings()

  const data = buildFullBackupArchive(
    {
      books,
      progressList,
      bookmarksByBook,
      histories,
      settings,
    },
    { includeApiKeys: options.includeApiKeys }
  )

  const stamp = dayjs().format('YYYYMMDD-HHmmss')
  const filename = `readbridge-backup-${stamp}.rbk`
  const saveResult = await fileAdapter.saveBinaryFile({
    filename,
    data,
    mimeType: BACKUP_MIME_TYPE,
  })

  return {
    saved: saveResult.saved,
    filename,
    bookCount: books.length,
  }
}

export async function exportSingleBookBackup(
  bookId: string
): Promise<{ saved: boolean; filename: string }> {
  const book = await db.getBook(bookId)
  if (!book) {
    throw new Error('Book not found')
  }
  const progress = await db.getReadingProgress(bookId)
  const bookmarks = useBookmarkStore.getState().getBookmarksByBookId(bookId)
  const data = buildSingleBookArchive(book, progress, bookmarks)
  const filename = `${sanitizeArchiveFilename(book.title)}.rbk`
  const saveResult = await fileAdapter.saveBinaryFile({
    filename,
    data,
    mimeType: BACKUP_MIME_TYPE,
  })

  return {
    saved: saveResult.saved,
    filename,
  }
}

export async function inspectBackupBytes(bytes: Uint8Array): Promise<{
  parsed: ParsedBackupArchive
  summary: BackupInspectSummary
}> {
  const parsed = parseBackupArchive(bytes)
  const existingBooks = await db.getAllBooks(false)
  const summary = inspectBackupArchive(parsed, existingBooks)
  return { parsed, summary }
}

export async function importBackupBytes(
  bytes: Uint8Array,
  strategy: BackupConflictStrategy
): Promise<BackupImportResult> {
  const parsed = parseBackupArchive(bytes)
  const driver = createAppBackupDriver()
  const result = await applyBackupArchive(parsed, strategy, driver)

  const currentReadingId = useSiderStore.getState().readingId
  if (currentReadingId && result.affectedBookIds.includes(currentReadingId)) {
    await useReadingProgressStore.getState().updateReadingProgress(currentReadingId)
  }

  return result
}
