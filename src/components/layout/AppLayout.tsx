import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Layout, Button, Space, Drawer } from 'antd';
import {
  Bars3Icon,
  Bars3BottomLeftIcon,
  ArrowRightStartOnRectangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import styled from 'styled-components';
import { Sidebar } from './Sidebar';

const { Header, Sider, Content } = Layout;

const StyledHeader = styled(Header)`
  background: #fff;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #E5E7EB;
  box-shadow: none;
  position: sticky;
  top: 0;
  z-index: 10;
  height: 56px;
  line-height: 56px;

  @media (min-width: 768px) {
    padding: 0 24px;
    gap: 16px;
    height: 64px;
    line-height: 64px;
  }
`;

const TriggerIcon = styled.span`
  font-size: 20px;
  cursor: pointer;
  color: #6B7280;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  transition: background-color 0.15s;
  &:hover { background: #F3F4F6; color: #7C3AED; }
`;

const StyledContent = styled(Content)`
  padding: 16px;
  min-height: calc(100vh - 56px);
  overflow-y: auto;

  @media (min-width: 768px) {
    padding: 24px;
    min-height: calc(100vh - 64px);
  }
`;

const Logo = styled.div<{ $collapsed: boolean }>`
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ $collapsed }) => ($collapsed ? '16px' : '18px')};
  font-weight: 700;
  color: #7C3AED;
  white-space: nowrap;
  overflow: hidden;
  padding: 0 ${({ $collapsed }) => ($collapsed ? '8px' : '24px')};
  border-bottom: 1px solid #E5E7EB;
`;

const MobileDrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #E5E7EB;
`;

const MobileLogoText = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: #7C3AED;
`;

const UserName = styled.span`
  font-size: 13px;
  color: #6B7280;
`;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          collapsedWidth={80}
          width={240}
          style={{ background: '#fff', borderRight: '1px solid #E5E7EB' }}
        >
          <Logo $collapsed={collapsed}>
            {collapsed ? '฿' : 'จัดการเงิน'}
          </Logo>
          <Sidebar onNavigate={() => {}} />
        </Sider>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={280}
          closable={false}
          styles={{
            body: { padding: 0 },
            header: { display: 'none' },
          }}
        >
          <MobileDrawerHeader>
            <MobileLogoText>฿ จัดการเงิน</MobileLogoText>
            <Button
              type="text"
              icon={<XMarkIcon className="w-4 h-4" />}
              onClick={() => setDrawerOpen(false)}
              style={{ color: '#6B7280' }}
            />
          </MobileDrawerHeader>
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout>
        <StyledHeader>
          <TriggerIcon onClick={() => isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed)}>
            {isMobile ? <Bars3Icon className="w-5 h-5" /> : (collapsed ? <Bars3Icon className="w-5 h-5" /> : <Bars3BottomLeftIcon className="w-5 h-5" />)}
          </TriggerIcon>
          <div style={{ flex: 1 }} />
          <Space size={8}>
            <UserName>{user?.username}</UserName>
            <Button
              type="text"
              icon={<ArrowRightStartOnRectangleIcon className="w-4 h-4" />}
              onClick={logout}
              style={{ color: '#6B7280' }}
              size={isMobile ? 'small' : 'middle'}
            >
              {isMobile ? '' : 'ออกจากระบบ'}
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
