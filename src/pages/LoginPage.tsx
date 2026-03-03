import { useState } from 'react';
import { Card, Form, Input, Button, Typography, App } from 'antd';
import { UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();
  const { login, register } = useAuth();
  const [form] = Form.useForm();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      if (isRegister) {
        await register(values.username, values.password);
      } else {
        await login(values.username, values.password);
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'เกิดข้อผิดพลาด';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 400, border: '1px solid #E5E7EB', boxShadow: 'none' }}>
        <Typography.Title level={3} style={{ textAlign: 'center', color: '#7C3AED' }}>
          {isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
        </Typography.Title>
        <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
          ระบบจัดการเงินส่วนตัว
        </Typography.Text>
        <Form form={form} onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="username"
            rules={[
              { required: true, message: 'กรุณากรอกชื่อผู้ใช้' },
              ...(isRegister ? [{ min: 3, message: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร' }] : []),
            ]}
          >
            <Input prefix={<UserIcon className="w-4 h-4 text-gray-400" />} placeholder="ชื่อผู้ใช้" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'กรุณากรอกรหัสผ่าน' },
              ...(isRegister ? [{ min: 6, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }] : []),
            ]}
          >
            <Input.Password prefix={<LockClosedIcon className="w-4 h-4 text-gray-400" />} placeholder="รหัสผ่าน" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          <Button type="link" onClick={() => { setIsRegister(!isRegister); form.resetFields(); }}>
            {isRegister ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิก'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
