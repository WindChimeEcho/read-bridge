import { Tabs } from "antd";
import React from "react";

function MenuLine({
  selectedTab,
  items,
  onTabChange
}: {
  selectedTab: string,
  items: { label: string, key: string, disabled?: boolean }[],
  onTabChange: (key: string) => void
}) {
  return (
    <Tabs
      activeKey={selectedTab}
      items={items}
      onChange={onTabChange}
      className="w-full [&_.ant-tabs-nav-list]:w-full [&_.ant-tabs-tab]:flex-1 [&_.ant-tabs-tab]:justify-center"
    />
  )
}

const MemoizedMenuLine = React.memo(MenuLine);
MemoizedMenuLine.displayName = 'MenuLine';

export default MemoizedMenuLine;