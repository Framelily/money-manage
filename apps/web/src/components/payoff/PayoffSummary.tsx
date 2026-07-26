import { Card, Tag, Table, Statistic, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { PayoffResult, PayoffPlanItem } from '@/utils/payoffCalculator';
import { formatBaht } from '@/utils/format';
import { getProviderTagColor, getProviderLabel } from '@/utils/providerConfig';
import { MONTHS_BE } from '@/types';

interface Props {
  result: PayoffResult;
}

export function PayoffSummary({ result }: Props) {
  const { selected, totalUsed, moneyLeft, monthlySavings } = result;

  // หาค่างวดที่ประหยัดสูงสุด (เดือนแรก)
  const maxMonthlySaving = Math.max(...MONTHS_BE.map((m) => monthlySavings[m]));

  if (selected.length === 0) {
    return (
      <Card>
        <Empty
          description="เงินไม่เพียงพอปิดรายการผ่อนใด ๆ — ลองเพิ่มจำนวนเงิน"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  const columns: ColumnsType<PayoffPlanItem> = [
    {
      title: 'ชื่อรายการ',
      dataIndex: ['plan', 'name'],
      key: 'name',
    },
    {
      title: 'ผู้ให้บริการ',
      dataIndex: ['plan', 'provider'],
      key: 'provider',
      render: (provider: string, record) => (
        <Tag color={getProviderTagColor(provider, record.plan.providerColor)}>
          {getProviderLabel(provider)}
        </Tag>
      ),
    },
    {
      title: 'ยอดคงเหลือ',
      dataIndex: 'remaining',
      key: 'remaining',
      align: 'right',
      render: (v: number) => formatBaht(v),
    },
    {
      title: 'ค่างวด/เดือน',
      dataIndex: 'perMonth',
      key: 'perMonth',
      align: 'right',
      render: (v: number) => formatBaht(v),
    },
    {
      title: 'งวดคงเหลือ',
      dataIndex: 'remainingInstallments',
      key: 'remainingInstallments',
      align: 'right',
      render: (v: number) => `${v} งวด`,
    },
  ];

  const totalPerMonth = selected.reduce((sum, item) => sum + item.perMonth, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card size="small">
          <Statistic title="ปิดได้" value={selected.length} suffix="รายการ" />
        </Card>
        <Card size="small">
          <Statistic title="ยอดที่ใช้ปิด" value={totalUsed} prefix="฿" precision={2} />
        </Card>
        <Card size="small">
          <Statistic title="เงินเหลือ" value={moneyLeft} prefix="฿" precision={2} valueStyle={{ color: '#10b981' }} />
        </Card>
        <Card size="small">
          <Statistic title="ประหยัด/เดือน" value={maxMonthlySaving} prefix="฿" precision={2} valueStyle={{ color: '#4DA8DA' }} />
        </Card>
      </div>

      <Card title="รายการที่ควรปิด (Snowball)" size="small">
        <Table<PayoffPlanItem>
          dataSource={selected}
          columns={columns}
          rowKey={(r) => r.plan.id}
          pagination={false}
          size="small"
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}><strong>รวม</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right"><strong>{formatBaht(totalUsed)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right"><strong>{formatBaht(totalPerMonth)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={4} />
              </Table.Summary.Row>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2} className="!text-green-600"><strong>เงินเหลือหลังปิด</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right" className="!text-green-600"><strong>{formatBaht(moneyLeft)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={3} colSpan={2} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>
    </div>
  );
}
