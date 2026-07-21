import { LockOutlined, MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Form, Input } from 'antd'
import { useState } from 'react'
import { useAuth } from '../../shared/auth'
import { ApiClientError } from '../../shared/lib/api-client'
import { InlineBanner } from '../../widgets/backoffice-shell'
import { TechnicianShell, technicianPalette } from '../../widgets/technician-shell'

type ProfileFormValues = {
  fullName: string
  email?: string
  phone?: string
}

type PasswordFormValues = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function TechnicianProfilePage() {
  const { user, updateProfile } = useAuth()
  const [profileForm] = Form.useForm<ProfileFormValues>()
  const [passwordForm] = Form.useForm<PasswordFormValues>()

  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)

  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  const initials = (user?.fullName || 'T').trim().charAt(0).toUpperCase()

  async function handleProfileSubmit(values: ProfileFormValues) {
    setSavingProfile(true)
    setProfileError('')
    setProfileSaved(false)
    try {
      await updateProfile(values)
      setProfileSaved(true)
    } catch (error) {
      setProfileError(error instanceof ApiClientError || error instanceof Error ? error.message : 'Unable to save your profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handlePasswordSubmit(values: PasswordFormValues) {
    setSavingPassword(true)
    setPasswordError('')
    setPasswordSaved(false)
    try {
      await updateProfile({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      setPasswordSaved(true)
      passwordForm.resetFields()
    } catch (error) {
      setPasswordError(error instanceof ApiClientError || error instanceof Error ? error.message : 'Unable to change your password.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <TechnicianShell eyebrow="Technician" title="My profile">
      <div className="grid gap-5 *:min-w-0 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card
          bordered={false}
          className="rounded-2xl"
          styles={{ body: { padding: 24 } }}
          style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, border: `1px solid ${technicianPalette.border}` }}
        >
          <div className="flex flex-col items-center text-center">
            <Avatar size={72} style={{ background: technicianPalette.red, color: '#fff', fontSize: 26, fontWeight: 600 }}>
              {initials}
            </Avatar>
            <div className="mt-4 text-[18px] font-semibold" style={{ color: technicianPalette.ink }}>
              {user?.fullName}
            </div>
            <div className="mt-1 text-sm" style={{ color: technicianPalette.textMuted }}>
              Technician
            </div>
            <div
              className="mt-4 w-full rounded-xl px-4 py-3 text-left text-sm"
              style={{ background: technicianPalette.panelAlt, color: technicianPalette.inkSoft }}
            >
              <div className="flex items-center gap-2">
                <MailOutlined style={{ color: technicianPalette.textMuted }} />
                <span className="truncate">{user?.email || 'No email on file'}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <PhoneOutlined style={{ color: technicianPalette.textMuted }} />
                <span>{user?.phone || 'No phone on file'}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card
            bordered={false}
            className="rounded-2xl"
            styles={{ body: { padding: 24 } }}
            style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, border: `1px solid ${technicianPalette.border}` }}
            title={
              <div className="py-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: technicianPalette.textMuted }}>
                  Account details
                </div>
                <div className="mt-1 text-[16px] font-semibold" style={{ color: technicianPalette.ink }}>
                  Contact information
                </div>
              </div>
            }
          >
            {profileError ? <InlineBanner tone="error">{profileError}</InlineBanner> : null}
            {profileSaved ? <InlineBanner tone="success">Profile updated.</InlineBanner> : null}

            <Form
              form={profileForm}
              layout="vertical"
              initialValues={{ fullName: user?.fullName, email: user?.email, phone: user?.phone }}
              onFinish={handleProfileSubmit}
              onValuesChange={() => setProfileSaved(false)}
            >
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Form.Item name="fullName" label="Full name" rules={[{ required: true, message: 'Full name is required' }]}>
                  <Input prefix={<UserOutlined style={{ color: technicianPalette.textMuted }} />} />
                </Form.Item>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Email is required' },
                    { type: 'email', message: 'A valid email is required' },
                  ]}
                >
                  <Input prefix={<MailOutlined style={{ color: technicianPalette.textMuted }} />} />
                </Form.Item>
              </div>
              <Form.Item
                name="phone"
                label="Phone"
                rules={[{ pattern: /^(0|\+84)\d{9,10}$/, message: 'Enter a valid phone number (e.g. 0901234567)' }]}
              >
                <Input prefix={<PhoneOutlined style={{ color: technicianPalette.textMuted }} />} style={{ maxWidth: 280 }} />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={savingProfile}>
                Save changes
              </Button>
            </Form>
          </Card>

          <Card
            bordered={false}
            className="rounded-2xl"
            styles={{ body: { padding: 24 } }}
            style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, border: `1px solid ${technicianPalette.border}` }}
            title={
              <div className="py-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: technicianPalette.textMuted }}>
                  Security
                </div>
                <div className="mt-1 text-[16px] font-semibold" style={{ color: technicianPalette.ink }}>
                  Change password
                </div>
              </div>
            }
          >
            {passwordError ? <InlineBanner tone="error">{passwordError}</InlineBanner> : null}
            {passwordSaved ? <InlineBanner tone="success">Password changed.</InlineBanner> : null}

            <Form form={passwordForm} layout="vertical" onFinish={handlePasswordSubmit} onValuesChange={() => setPasswordSaved(false)}>
              <div className="grid gap-x-4 sm:grid-cols-3">
                <Form.Item name="currentPassword" label="Current password" rules={[{ required: true, message: 'Current password is required' }]}>
                  <Input.Password prefix={<LockOutlined style={{ color: technicianPalette.textMuted }} />} />
                </Form.Item>
                <Form.Item
                  name="newPassword"
                  label="New password"
                  dependencies={['currentPassword']}
                  rules={[
                    { required: true, min: 8, message: 'At least 8 characters' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || value !== getFieldValue('currentPassword')) return Promise.resolve()
                        return Promise.reject(new Error('New password must differ from the current one'))
                      },
                    }),
                  ]}
                >
                  <Input.Password prefix={<LockOutlined style={{ color: technicianPalette.textMuted }} />} />
                </Form.Item>
                <Form.Item
                  name="confirmPassword"
                  label="Confirm new password"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: 'Please confirm the new password' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || value === getFieldValue('newPassword')) return Promise.resolve()
                        return Promise.reject(new Error('New password and confirmation do not match'))
                      },
                    }),
                  ]}
                >
                  <Input.Password prefix={<LockOutlined style={{ color: technicianPalette.textMuted }} />} />
                </Form.Item>
              </div>
              <Button danger htmlType="submit" loading={savingPassword}>
                Update password
              </Button>
            </Form>
          </Card>
        </div>
      </div>
    </TechnicianShell>
  )
}
