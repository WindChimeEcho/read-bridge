'use client'

import { Button, Popover, Tooltip } from "antd"
import { PlusOutlined, AlignLeftOutlined, HistoryOutlined, CloseOutlined } from "@ant-design/icons"
import { useOutputOptions } from "@/store/useOutputOptions"
import { useState } from "react"
import { useTranslation } from "@/i18n/useTranslation";

type ChatTools = {
  isGenerating: boolean
  onPlus: () => void
  onChangePrompt: (id: string) => void
  onHistory: () => void
  onCloseModal: () => void
}

export default function ChatTools({ isGenerating, onPlus, onChangePrompt, onHistory, onCloseModal }: ChatTools) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false);

  const handleChangePrompt = (value: string) => {
    onChangePrompt(value);
    setTimeout(() => {
      setOpen(false);
    }, 200);
  };

  return (
    <>
      <div className="w-full h-[42px] flex items-center justify-end p-2 shadow-md">
        <div className="mr-auto text-sm font-bold">{t('sider.readingAssistant')}</div>
        <Popover
          open={open}
          onOpenChange={setOpen}
          content={<ChangePromptPopover onChangePrompt={handleChangePrompt} />}
          placement="leftTop"
          trigger="click"
        >
          <Button type="text" disabled={isGenerating} icon={<AlignLeftOutlined />} onClick={() => setOpen(true)} />
        </Popover>
        <Button type="text" disabled={isGenerating} icon={<PlusOutlined />} onClick={onPlus} />
        <Button type="text" disabled={isGenerating} icon={<HistoryOutlined />} onClick={onHistory} />
        <Button type="text" disabled={isGenerating} icon={<CloseOutlined />} onClick={onCloseModal} />
      </div>
    </>
  )
}

function ChangePromptPopover({ onChangePrompt }: { onChangePrompt: (id: string) => void }) {
  const { promptOptions, selectedId, setSelectedId } = useOutputOptions();

  function handleChangePrompt(id: string) {
    setSelectedId(id)
    onChangePrompt(id)
  }
  return (
    <div className="flex flex-col gap-1">
      {promptOptions.map((option) => {
        const btn = (
          <Button
            key={option.id}
            type='text'
            className={`w-full text-left px-3 py-2 h-auto ${selectedId === option.id ? 'bg-[#e6f4ff] text-[#1677ff]' : ''
              }`}
            onClick={() => handleChangePrompt(option.id)}
          >
            <span className="truncate block">{option.name}</span>
          </Button>
        );

        return option.name.length > 15 ? (
          <Tooltip key={option.id} title={option.name} placement="right">
            {btn}
          </Tooltip>
        ) : btn;
      })}
    </div>
  );
}
