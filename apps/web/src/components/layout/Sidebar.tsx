import { useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'antd';
import {
  Squares2X2Icon,
  CreditCardIcon,
  WalletIcon,
  UserGroupIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';

interface Props {
  onNavigate?: () => void;
}

const menuItems = [
  { key: '/', icon: <Squares2X2Icon className="w-[18px] h-[18px]" />, label: 'แดชบอร์ด' },
  { key: '/installments', icon: <CreditCardIcon className="w-[18px] h-[18px]" />, label: 'หนี้ผ่อนชำระ' },
  { key: '/budget', icon: <WalletIcon className="w-[18px] h-[18px]" />, label: 'งบรายเดือน' },
  { key: '/debts', icon: <UserGroupIcon className="w-[18px] h-[18px]" />, label: 'คนที่เป็นหนี้เรา' },
  { key: '/payoff', icon: <CalculatorIcon className="w-[18px] h-[18px]" />, label: 'วิเคราะห์ปิดหนี้' },
];

export function Sidebar({ onNavigate }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={({ key }) => {
        navigate(key);
        onNavigate?.();
      }}
      style={{ borderInlineEnd: 'none', fontWeight: 600 }}
    />
  );
}
