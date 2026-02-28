import { useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'antd';
import {
  DashboardOutlined,
  CreditCardOutlined,
  WalletOutlined,
  TeamOutlined,
} from '@ant-design/icons';

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'แดชบอร์ด' },
  { key: '/installments', icon: <CreditCardOutlined />, label: 'หนี้ผ่อนชำระ' },
  { key: '/budget', icon: <WalletOutlined />, label: 'งบรายเดือน' },
  { key: '/debts', icon: <TeamOutlined />, label: 'คนที่เป็นหนี้เรา' },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={({ key }) => navigate(key)}
      style={{ borderInlineEnd: 'none', height: '100%' }}
    />
  );
}
