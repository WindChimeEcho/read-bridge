import type { UploadProps } from 'antd';
import { Upload } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { BOOK_FORMAT } from '@/constants/book';
import { isSupportedBookFile, useBookImport } from '@/hooks/useBookImport';
import { isIOS } from '@/utils/platform';
import { useEffect, useRef, useState } from 'react';

const { Dragger } = Upload;
const DEFAULT_BOOK_ACCEPT = Object.values(BOOK_FORMAT).map(format => `.${format}`).join(',');

export default function BookUploader() {
  const { importFiles } = useBookImport();
  const pendingFilesRef = useRef<File[]>([]);
  const flushScheduledRef = useRef(false);
  const [accept, setAccept] = useState<string | undefined>(DEFAULT_BOOK_ACCEPT);

  useEffect(() => {
    if (isIOS()) {
      setAccept(undefined);
    }
  }, []);

  const props: UploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    fileList: [],
    accept,
    beforeUpload: (file) => {
      pendingFilesRef.current.push(file);
      if (!flushScheduledRef.current) {
        flushScheduledRef.current = true;
        queueMicrotask(() => {
          flushScheduledRef.current = false;
          const batch = pendingFilesRef.current.splice(0);
          if (batch.length > 0) {
            void importFiles(batch);
          }
        });
      }
      return Upload.LIST_IGNORE;
    },
    onDrop(e) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const invalidFiles = droppedFiles.filter(file => !isSupportedBookFile(file));
      if (invalidFiles.length > 0) {
        void importFiles(invalidFiles);
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
