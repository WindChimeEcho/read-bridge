'use client'
import { useState, useRef, useCallback, useEffect } from 'react';
import { useSiderStore } from '@/store/useSiderStore';
import { CaretLeftFilled, CaretRightFilled } from '@ant-design/icons';
import { theme } from 'antd';

const MIN_WIDTH = 400;
const MAX_WIDTH = 600;

export default function SiderLayout({ children }: { children: React.ReactNode }) {
  const { siderWidth, setSiderWidth, siderCollapsed, toggleSiderCollapsed } = useSiderStore();
  const [width, setWidth] = useState(siderWidth); // 默认宽度
  const [dragging, setDragging] = useState(false);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    setWidth(siderWidth);
  }, [siderWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    setDragging(true);
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.userSelect = 'none'; // 防止拖拽时选中文本
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const diff = startX.current - e.clientX;
    const newWidth = Math.min(Math.max(startWidth.current + diff, MIN_WIDTH), MAX_WIDTH);
    setWidth(newWidth);
  }, [setWidth]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragging(false);
    document.body.style.userSelect = '';
    setSiderWidth(width);
  }, [setSiderWidth, width]);

  // 事件监听
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const { token } = theme.useToken();
  return (
    <div
      className="h-full relative shadow-sm flex-shrink-0"
      style={{
        width: siderCollapsed ? '0px' : `${width}px`,
        backgroundColor: token.colorBgContainer,
        borderLeft: siderCollapsed ? 'none' : `1px solid ${token.colorBorder}`,
        transition: dragging ? 'none' : 'width 0.3s ease-in-out',
      }}
    >
      {!siderCollapsed && (
        <div
          className="absolute left-[0px] top-0 bottom-0 w-[8px] cursor-ew-resize hover:bg-blue-300 transition-colors z-10"
          onMouseDown={handleMouseDown}
        />
      )}
      <button
        type="button"
        onClick={toggleSiderCollapsed}
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute top-1/2 -translate-y-1/2 -left-[18px] z-20 w-[18px] h-[48px] flex items-center justify-center rounded-l-md cursor-pointer transition-opacity opacity-80 hover:opacity-100"
        style={{
          backgroundColor: token.colorBgContainer,
          color: token.colorText,
          borderTop: `1px solid ${token.colorBorder}`,
          borderBottom: `1px solid ${token.colorBorder}`,
          borderLeft: `1px solid ${token.colorBorder}`,
          borderRight: 'none',
          boxShadow: '-2px 0 6px rgba(0, 0, 0, 0.08)',
        }}
      >
        {siderCollapsed ? (
          <CaretLeftFilled style={{ fontSize: 12 }} />
        ) : (
          <CaretRightFilled style={{ fontSize: 12 }} />
        )}
      </button>
      <div className="w-full h-full overflow-hidden">
        <div className="h-full" style={{ width: `${width}px` }}>
          {children}
        </div>
      </div>
    </div>
  )
}

