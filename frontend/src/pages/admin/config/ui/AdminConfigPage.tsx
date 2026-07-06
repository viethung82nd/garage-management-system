import { Button, Card, Form, InputNumber } from 'antd'
import { useEffect, useState } from 'react'
import { fetchSystemConfig, updateSystemConfig, type SystemConfig } from '../api/configApi'
import { AdminShell, adminPalette } from '../../ui/AdminShell'

export default function AdminConfigPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [saved, setSaved] = useState(false)
  const [form] = Form.useForm<SystemConfig>()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setRequestError('')
      try {
        const config = await fetchSystemConfig()
        if (cancelled) return
        form.setFieldsValue(config)
      } catch (error) {
        if (!cancelled) {
          setRequestError(error instanceof Error ? error.message : 'Unable to load system configuration.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [form])

  async function handleSubmit(values: SystemConfig) {
    setSaving(true)
    setRequestError('')
    setSaved(false)
    try {
      await updateSystemConfig(values)
      setSaved(true)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to save system configuration.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell eyebrow="Admin" title="System configuration">
      <Card
        bordered={false}
        className="rounded-[32px]"
        loading={isLoading}
        styles={{ body: { padding: 24 } }}
        style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, maxWidth: 480 }}
      >
        {requestError ? (
          <div className="mb-4 rounded-[18px] border px-4 py-3 text-sm font-medium" style={{ borderColor: '#fecaca', background: '#fff1f2', color: '#991b1b' }}>
            {requestError}
          </div>
        ) : null}
        {saved ? (
          <div className="mb-4 rounded-[18px] border px-4 py-3 text-sm font-medium" style={{ borderColor: '#bbf7d0', background: '#f0fdf4', color: '#166534' }}>
            Configuration saved.
          </div>
        ) : null}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={() => setSaved(false)}
        >
          <Form.Item
            name="openHour"
            label="Opening hour (24h)"
            rules={[{ required: true, message: 'Opening hour is required' }]}
          >
            <InputNumber min={0} max={23} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="lastSlotHour"
            label="Last booking slot hour (24h)"
            rules={[{ required: true, message: 'Last slot hour is required' }]}
          >
            <InputNumber min={0} max={23} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="slotCapacity"
            label="Bookings per slot"
            rules={[{ required: true, message: 'Slot capacity is required' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save configuration
          </Button>
        </Form>
      </Card>
    </AdminShell>
  )
}
