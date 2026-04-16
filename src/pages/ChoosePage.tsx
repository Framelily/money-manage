import { useNavigate } from 'react-router-dom';
import { Card, Typography, Button } from 'antd';
import { WalletIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

export function ChoosePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <Typography.Title level={3} style={{ margin: 0 }}>
            สวัสดี {user?.username}
          </Typography.Title>
          <Typography.Text type="secondary">เลือกสิ่งที่ต้องการทำ</Typography.Text>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card
            hoverable
            onClick={() => navigate('/')}
            className="text-center"
            styles={{ body: { padding: 32 } }}
          >
            <WalletIcon className="w-16 h-16 mx-auto mb-3 text-blue-500" />
            <Typography.Title level={4} style={{ margin: 0 }}>
              จัดการเงิน
            </Typography.Title>
            <Typography.Text type="secondary">แดชบอร์ด หนี้ผ่อน งบรายเดือน</Typography.Text>
          </Card>

          <Card
            hoverable
            onClick={() => navigate('/daily')}
            className="text-center"
            styles={{ body: { padding: 32 } }}
          >
            <PencilSquareIcon className="w-16 h-16 mx-auto mb-3 text-green-500" />
            <Typography.Title level={4} style={{ margin: 0 }}>
              บันทึกประจำวัน
            </Typography.Title>
            <Typography.Text type="secondary">จดรายรับรายจ่ายแบบไว</Typography.Text>
          </Card>
        </div>

        <div className="text-center mt-6">
          <Button type="text" onClick={logout}>
            ออกจากระบบ
          </Button>
        </div>
      </div>
    </div>
  );
}
