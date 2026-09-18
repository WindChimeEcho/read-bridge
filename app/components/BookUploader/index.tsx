import type { UploadProps, UploadFile } from 'antd';
import { message, Upload } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { BOOK_FORMAT } from '@/constants/book';
import { UPLOAD_CONFIG } from '@/constants/upload';
import db from '@/services/DB';
import { Book } from '@/types/book';
import { handleFileUpload } from '@/services/ServerUpload';
import { useTranslation } from '@/i18n/useTranslation';
import { useCallback, useState, useRef } from 'react';

const { Dragger } = Upload;

function checkFileFormat(file: File): boolean {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  return Object.values(BOOK_FORMAT).some(
    format => format.toLowerCase() === fileExtension
  );
}

export default function BookUploader() {
  const { t } = useTranslation();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const errorShownRef = useRef<Set<string>>(new Set());
  const batchInfoRef = useRef<{ total: number; processed: number }>({ total: 0, processed: 0 });

  const showError = useCallback((fileNames: string) => {
    const supportedFormats = Object.values(BOOK_FORMAT).join('/');
    message.error(t('uploader.formatNotSupported', { fileNames, supportedFormats }));
  }, [t]);

  const showCountError = useCallback(() => {
    // 避免重复显示相同的错误
    const errorKey = 'maxCountExceeded';
    if (!errorShownRef.current.has(errorKey)) {
      errorShownRef.current.add(errorKey);
      message.error(t('uploader.maxCountExceeded', { maxCount: UPLOAD_CONFIG.MAX_BOOK_COUNT.toString() }));
      // 2秒后清除错误标记，允许再次显示
      setTimeout(() => {
        errorShownRef.current.delete(errorKey);
      }, 2000);
    }
  }, [t]);

  const props: UploadProps = {
    name: 'file',
    multiple: true,
    action: '',
    maxCount: UPLOAD_CONFIG.MAX_BOOK_COUNT,
    showUploadList: false,
    fileList,
    customRequest: async (options) => {
      const { file } = options;

      try {
        const result = await handleFileUpload(file as File);
        options.onSuccess?.(result);
      } catch (error) {
        if (error instanceof Error) options.onError?.(error)
        else options.onError?.(new Error(String(error)));
      }
    },
    accept: Object.values(BOOK_FORMAT).map(format => `.${format}`).join(','),

    beforeUpload: (file, fileList) => {
      const isAcceptedFormat = checkFileFormat(file);

      if (!isAcceptedFormat) {
        showError(file.name);
        return Upload.LIST_IGNORE;
      }

      if (fileList.length > UPLOAD_CONFIG.MAX_BOOK_COUNT) {
        showCountError();
        return Upload.LIST_IGNORE;
      }

      // 初始化批次信息
      if (batchInfoRef.current.total === 0) {
        batchInfoRef.current = { total: fileList.length, processed: 0 };
      }

      return true;
    },
    onDrop(e) {
      const files = Array.from(e.dataTransfer.files);
      const invalidFiles = files.filter(file => !checkFileFormat(file));

      if (invalidFiles.length > 0) {
        const fileNames = invalidFiles.map(file => file.name).join(', ');
        showError(fileNames);
      }

      if (files.length > UPLOAD_CONFIG.MAX_BOOK_COUNT) {
        showCountError();
      }
    },
    onChange: async (info) => {
      const { status, response } = info.file;

      // 检查是否应该清空列表的函数
      const checkAndClearList = () => {
        batchInfoRef.current.processed++;
        if (batchInfoRef.current.processed >= batchInfoRef.current.total) {
          setFileList([]);
          batchInfoRef.current = { total: 0, processed: 0 };
        }
      };

      if (status === 'error') {
        const errorMsg = response?.error || t('uploader.importFailed', { fileName: info.file.name });
        message.error(t('uploader.importFailedWithError', {
          fileName: info.file.name,
          error: errorMsg
        }));
        checkAndClearList();
        return;
      }
      else if (status === 'done') {
        try {
          const id = await db.addBook(response as Book)
          await db.addReadingProgress(id)
          message.success(t('uploader.importSuccess', { fileName: info.file.name }));
        } catch (error) {
          if (error instanceof Error) {
            message.error(t('uploader.importFailedWithError', {
              fileName: info.file.name,
              error: error.message
            }));
          } else {
            message.error(t('uploader.importFailed', { fileName: info.file.name }));
          }
        }
        checkAndClearList();
      } else {
        // 更新文件列表状态
        setFileList(info.fileList);
      }
    },
  };

  return (
    <div className="w-[100%] h-[100%]">
      <Dragger {...props} className="h-full flex items-center justify-center bg-[var(--ant-color-bg-elevated)] dark:bg-[var(--ant-color-bg-elevated)] rounded-lg hover:bg-[var(--ant-color-fill-tertiary)] dark:hover:bg-[var(--ant-color-fill-tertiary)] transition-colors">
        <PlusOutlined className="text-2xl text-[var(--ant-color-text-tertiary)]" />
      </Dragger>
    </div>
  );
}
