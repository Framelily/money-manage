import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Layout, Typography, Button, Space } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import styled from 'styled-components';
import { Sidebar } from './Sidebar';

const { Header, Sider, Content } = Layout;

const StyledHeader = styled(Header)`
  background: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 10;
`;

const TriggerIcon = styled.span`
  font-size: 18px;
  cursor: pointer;
  color: #595959;
  &:hover { color: #1677ff; }
`;

const StyledContent = styled(Content)`
  padding: 24px;
  min-height: calc(100vh - 64px);
  overflow-y: auto;
`;

const Logo = styled.div<{ $collapsed: boolean }>`
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ $collapsed }) => ($collapsed ? '16px' : '18px')};
  font-weight: 700;
  color: #4f46e5;
  white-space: nowrap;
  overflow: hidden;
  padding: 0 ${({ $collapsed }) => ($collapsed ? '8px' : '24px')};
`;

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        breakpoint="lg"
        collapsedWidth={80}
        width={240}
        style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
      >
        <Logo $collapsed={collapsed}>
          {collapsed ? '฿' : 'จัดการเงิน'}
        </Logo>
        <Sidebar />
      </Sider>
      <Layout>
        <StyledHeader>
          <TriggerIcon onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </TriggerIcon>
          <Typography.Title level={5} style={{ margin: 0, flex: 1 }}>
            สรุปการเงินส่วนตัว
          </Typography.Title>
          <Space>
            <Typography.Text type="secondary">{user?.username}</Typography.Text>
            <Button type="text" icon={<LogoutOutlined />} onClick={logout}>
              ออกจากระบบ
            </Button>
          </Space>
        </StyledHeader>
        <StyledContent>
          <Outlet />
        </StyledContent>
      </Layout>
    </Layout>
  );
}
