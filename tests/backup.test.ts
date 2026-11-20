import { strToU8, unzipSync, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  applyBackupArchive,
  buildFullBackupArchive,
  buildSingleBookArchive,
  inspectBackupArchive,
  parseBackupArchive,
  type BackupDataSnapshot,
  type BackupSettingsPayload,
  type BackupStorageDriver,
} from '../services/BackupService'
import type { Book, Bookmark, ReadingProgress } from '../types/book'
import type { LLMHistory } from '../types/llm'

function makeBook(overrides: Partial<Book> = {}): Book {
  const id = overrides.id ?? 'book-1'
  return {
    id,
    title: overrides.title ?? 'Dune',
    author: overrides.author ?? 'Frank Herbert',
    fileHash: overrides.fileHash ?? 'hash-dune',
    createTime: overrides.createTime ?? 1700000000000,
    chapterList: overrides.chapterList ?? [
      { title: 'Chapter 1', paragraphs: ['A beginning is the time for taking the most delicate care.'] },
    ],
    toc: overrides.toc ?? [{ title: 'Chapter 1', index: 0 }],
    metadata: overrides.metadata ?? {
      title: overrides.title ?? 'Dune',
      author: overrides.author ?? 'Frank Herbert',
      language: 'en',
    },
  }
}

function makeProgress(bookId: string, chapterIndex = 0, lineIndex = 2): ReadingProgress {
  return {
    bookId,
    lastReadTime: 1700000050000,
    currentLocation: { chapterIndex, lineIndex },
    sentenceChapters: {
      [chapterIndex]: ['Line 0', 'Line 1', 'Line 2'],
    },
    sentenceFormatVersion: 2,
  }
}

function makeBookmark(id: string, bookId: string, lineIndex = 2, sentence = 'Line 2'): Bookmark {
  return {
    id,
    bookId,
    chapterIndex: 0,
    lineIndex,
    sentence,
    createTime: '2026-11-20 10:00:00',
  }
}

function makeHistory(id: string): LLMHistory {
  return {
    id,
    title: 'About Dune',
    timestamp: 1700000000,
    prompt: 'Explain simply',
    messages: [
      { role: 'user', content: 'What does this mean?', timestamp: 1700000001 },
      { role: 'assistant', content: 'It sets the tone.', timestamp: 1700000002 },
    ],
  }
}

function makeSettings(apiKey = 'sk-secret-key'): BackupSettingsPayload {
  return {
    llm: {
      providers: [
        {
          id: 'openai',
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
          apiKey,
          protocol: 'openai',
          models: [{ id: 'gpt-4o-mini', name: 'GPT-4o Mini', providerId: 'openai' }],
          isDefault: true,
        },
      ],
      chatModel: { id: 'gpt-4o-mini', name: 'GPT-4o Mini', providerId: 'openai' },
      parseModel: { id: 'gpt-4o-mini', name: 'GPT-4o Mini', providerId: 'openai' },
      chatThinking: { mode: 'default', effort: 'medium' },
      parseThinking: { mode: 'enabled', effort: 'high' },
    },
    outputOptions: {
      sentenceOptions: [{ id: 'rule-1', name: 'Rule 1', type: 'MD', rulePrompt: 'Break down' }],
      promptOptions: [{ id: 'prompt-1', name: 'Default', prompt: 'Helpful tutor' }],
      wordOptions: [{ id: 'word-1', name: 'Quick', rulePrompt: 'Define word' }],
      batchProcessingSize: 2,
      selectedId: 'prompt-1',
      selectedWordId: 'word-1',
    },
    style: {
      readingTheme: 'paper',
      themeInitialized: true,
      useCustomTextColor: false,
      lightModeTextColor: '#000000',
      darkModeTextColor: '#ffffff',
      language: 'zh',
      fontSize: 'large',
    },
    tts: {
      ttsProvider: 'system',
      ttsConfig: {
        system: { voiceType: 'Google US English', speedRatio: 1.2 },
        volcengine: { voiceType: '', speedRatio: 1.0, appid: 'volc-app', token: 'volc-tok' },
      },
      ttsGlobalConfig: { autoSentenceTTS: true, autoWordTTS: false },
    },
  }
}

function createMemoryDriver(initial: {
  books?: Book[]
  progressByBook?: Record<string, ReadingProgress>
  bookmarksByBook?: Record<string, Bookmark[]>
  histories?: LLMHistory[]
  activeHistory?: LLMHistory | null
  settings?: BackupSettingsPayload
} = {}): {
  driver: BackupStorageDriver
  state: {
    books: Map<string, Book>
    progressByBook: Map<string, ReadingProgress>
    bookmarksByBook: Record<string, Bookmark[]>
    histories: LLMHistory[]
    activeHistory: LLMHistory | null
    settings: BackupSettingsPayload
  }
} {
  const books = new Map((initial.books ?? []).map(b => [b.id, b]))
  const progressByBook = new Map(Object.entries(initial.progressByBook ?? {}))
  const state = {
    books,
    progressByBook,
    bookmarksByBook: { ...(initial.bookmarksByBook ?? {}) },
    histories: [...(initial.histories ?? [])],
    activeHistory: initial.activeHistory ?? null,
    settings: initial.settings ?? {},
  }

  const driver: BackupStorageDriver = {
    getAllBooks: async () => Array.from(state.books.values()),
    putBookAndProgress: async (book, progress) => {
      state.books.set(book.id, book)
      if (progress) {
        state.progressByBook.set(book.id, { ...progress, bookId: book.id })
      }
    },
    getBookmarksByBook: () => state.bookmarksByBook,
    setBookmarksByBook: next => {
      state.bookmarksByBook = next
    },
    getHistories: () => state.histories,
    setHistories: (next, active) => {
      state.histories = next
      if (active !== undefined) {
        state.activeHistory = active
      }
    },
    getActiveHistory: () => state.activeHistory,
    getSettings: () => state.settings,
    applySettings: next => {
      state.settings = next
    },
  }

  return { driver, state }
}

describe('BackupService (.rbk export, inspect, import)', () => {
  it('round-trips a full backup without including any cache data', async () => {
    const book = makeBook()
    const snapshot: BackupDataSnapshot = {
      books: [book],
      progressList: [makeProgress(book.id, 0, 1)],
      bookmarksByBook: { [book.id]: [makeBookmark('bm-1', book.id, 1, 'Line 1')] },
      histories: [makeHistory('chat-1')],
      settings: makeSettings('sk-live-key'),
    }

    const bytes = buildFullBackupArchive(snapshot, { includeApiKeys: true })
    const rawZip = unzipSync(bytes)
    expect(Object.keys(rawZip).some(key => key.includes('cache'))).toBe(false)
    expect(Object.keys(rawZip)).toContain('manifest.json')
    expect(Object.keys(rawZip)).toContain('books/book-1.json')

    const parsed = parseBackupArchive(bytes)
    const summary = inspectBackupArchive(parsed, [])
    expect(summary.totalBooks).toBe(1)
    expect(summary.newBookCount).toBe(1)
    expect(summary.duplicateBookCount).toBe(0)
    expect(summary.totalBookmarks).toBe(1)
    expect(summary.totalHistories).toBe(1)
    expect(summary.hasSettings).toBe(true)
    expect(summary.includeApiKeys).toBe(true)

    const { driver, state } = createMemoryDriver()
    const result = await applyBackupArchive(parsed, 'skip', driver)
    expect(result.importedBooks).toBe(1)
    expect(result.mergedBookmarks).toBe(1)
    expect(result.mergedHistories).toBe(1)
    expect(result.restoredSettings).toBe(true)
    expect(state.books.get('book-1')?.title).toBe('Dune')
    expect(state.progressByBook.get('book-1')?.currentLocation.lineIndex).toBe(1)
    expect(state.settings.llm?.providers[0].apiKey).toBe('sk-live-key')
    expect(state.settings.style?.readingTheme).toBe('paper')
  })

  it('round-trips a single-book backup with progress and bookmarks only', async () => {
    const book = makeBook({ id: 'single-1', title: 'Foundation', fileHash: 'hash-foundation' })
    const progress = makeProgress('single-1', 0, 2)
    const bookmarks = [makeBookmark('bm-single', 'single-1', 2, 'Line 2')]

    const bytes = buildSingleBookArchive(book, progress, bookmarks)
    const parsed = parseBackupArchive(bytes)
    expect(parsed.manifest.exportType).toBe('book')
    expect(parsed.manifest.includeApiKeys).toBe(false)
    expect(parsed.histories).toHaveLength(0)
    expect(parsed.settings).toBeNull()

    const { driver, state } = createMemoryDriver()
    const result = await applyBackupArchive(parsed, 'skip', driver)
    expect(result.importedBooks).toBe(1)
    expect(result.restoredSettings).toBe(false)
    expect(state.books.get('single-1')?.title).toBe('Foundation')
    expect(state.progressByBook.get('single-1')?.currentLocation.lineIndex).toBe(2)
    expect(state.bookmarksByBook['single-1']).toHaveLength(1)
  })

  it('redacts API keys when includeApiKeys is false and preserves local keys during overwrite', async () => {
    const snapshot: BackupDataSnapshot = {
      books: [],
      progressList: [],
      bookmarksByBook: {},
      histories: [],
      settings: makeSettings('sk-sender-secret'),
    }

    const bytes = buildFullBackupArchive(snapshot, { includeApiKeys: false })
    const parsed = parseBackupArchive(bytes)
    expect(parsed.manifest.includeApiKeys).toBe(false)
    expect(parsed.settings?.llm?.providers[0].apiKey).toBe('')
    expect(parsed.settings?.tts?.ttsConfig.volcengine.appid).toBe('')
    expect(parsed.settings?.tts?.ttsConfig.volcengine.token).toBe('')

    const localSettings = makeSettings('sk-local-existing')
    const { driver, state } = createMemoryDriver({ settings: localSettings })
    await applyBackupArchive(parsed, 'overwrite', driver)

    expect(state.settings.llm?.providers[0].apiKey).toBe('sk-local-existing')
    expect(state.settings.tts?.ttsConfig.volcengine.appid).toBe('volc-app')
    expect(state.settings.tts?.ttsConfig.volcengine.token).toBe('volc-tok')
  })

  it('handles duplicate books by fileHash under skip vs overwrite while merging deduplicated bookmarks', async () => {
    const localBook = makeBook({ id: 'local-id', title: 'Local Copy', fileHash: 'shared-hash' })
    const incomingBook = makeBook({ id: 'foreign-id', title: 'Backup Copy', fileHash: 'shared-hash' })

    const incomingBytes = buildSingleBookArchive(
      incomingBook,
      makeProgress('foreign-id', 0, 2),
      [
        makeBookmark('bm-foreign-dup', 'foreign-id', 0, 'Same sentence'),
        makeBookmark('bm-foreign-new', 'foreign-id', 2, 'New sentence'),
      ]
    )
    const parsed = parseBackupArchive(incomingBytes)

    // 1) Skip strategy keeps local book/progress, merges only missing bookmark onto local-id
    const skipEnv = createMemoryDriver({
      books: [localBook],
      progressByBook: { 'local-id': makeProgress('local-id', 0, 0) },
      bookmarksByBook: {
        'local-id': [makeBookmark('bm-local-1', 'local-id', 0, 'Same sentence')],
      },
    })
    const skipSummary = inspectBackupArchive(parsed, [localBook])
    expect(skipSummary.duplicateBookCount).toBe(1)
    expect(skipSummary.newBookCount).toBe(0)

    const skipResult = await applyBackupArchive(parsed, 'skip', skipEnv.driver)
    expect(skipResult.skippedBooks).toBe(1)
    expect(skipResult.overwrittenBooks).toBe(0)
    expect(skipResult.mergedBookmarks).toBe(1)
    expect(skipEnv.state.books.get('local-id')?.title).toBe('Local Copy')
    expect(skipEnv.state.books.has('foreign-id')).toBe(false)
    expect(skipEnv.state.progressByBook.get('local-id')?.currentLocation.lineIndex).toBe(0)
    expect(skipEnv.state.bookmarksByBook['local-id']).toHaveLength(2)

    // 2) Overwrite strategy overwrites book & progress under local-id while preserving bookmark dedupe
    const overwriteEnv = createMemoryDriver({
      books: [localBook],
      progressByBook: { 'local-id': makeProgress('local-id', 0, 0) },
      bookmarksByBook: {
        'local-id': [makeBookmark('bm-local-1', 'local-id', 0, 'Same sentence')],
      },
    })
    const overwriteResult = await applyBackupArchive(parsed, 'overwrite', overwriteEnv.driver)
    expect(overwriteResult.overwrittenBooks).toBe(1)
    expect(overwriteResult.mergedBookmarks).toBe(1)
    expect(overwriteEnv.state.books.get('local-id')?.title).toBe('Backup Copy')
    expect(overwriteEnv.state.progressByBook.get('local-id')?.currentLocation.lineIndex).toBe(2)
    expect(overwriteEnv.state.bookmarksByBook['local-id']).toHaveLength(2)
    expect(overwriteEnv.state.bookmarksByBook['local-id'].every(b => b.bookId === 'local-id')).toBe(true)
  })

  it('rejects non-zip data, missing manifest, and unsupported format versions', () => {
    expect(() => parseBackupArchive(new Uint8Array([1, 2, 3, 4]))).toThrow(/not a valid/i)

    const missingManifestZip = zipSync({ 'other.txt': strToU8('hello') })
    expect(() => parseBackupArchive(missingManifestZip)).toThrow(/missing manifest\.json/i)

    const badVersionZip = zipSync({
      'manifest.json': strToU8(JSON.stringify({ formatVersion: 99, exportType: 'full' })),
    })
    expect(() => parseBackupArchive(badVersionZip)).toThrow(/Unsupported backup formatVersion/i)
  })
})
