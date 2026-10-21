/** Shapes returned by the Physio360 API (subset used by the mobile app). */

export type Permission =
  | 'patients.view' | 'patients.manage' | 'patients.delete'
  | 'appointments.view' | 'appointments.manage'
  | 'clinical.view' | 'clinical.write' | 'exercises.manage'
  | 'enquiries.manage'
  | 'billing.view' | 'billing.manage' | 'billing.void'
  | 'reports.view' | 'staff.manage' | 'settings.manage' | 'audit.view'
  | 'messages.send' | 'attendance.manage' | 'leave.approve' | 'payroll.manage'
  | 'branches.all';

export interface Currency { code: string; symbol: string; exponent: number }

export interface Session {
  user: { id: number; name: string; email: string; phone: string | null; title: string | null; color: string; roles?: string[]; is_practitioner: boolean; branch_ids?: number[] };
  tenant: { id: number; name: string; slug: string; timezone: string; country_code: string; currency: Currency; logo_url?: string | null; phone?: string | null };
  branches: { id: number; name: string; code: string; city: string | null }[];
  permissions: Permission[];
  must_change_password?: boolean;
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: number;
  status: AppointmentStatus;
  type: string;
  starts_at: string;
  ends_at: string;
  local_start: string;
  local_end: string;
  duration_minutes: number;
  branch_id: number;
  patient?: { id: number; full_name: string; mrn: string };
  practitioner?: { id: number; name: string; color: string };
  room?: { id: number; name: string } | null;
  service?: { id: number; name: string; color: string | null } | null;
  notes: string | null;
  booked_via: string;
  allowed_transitions: AppointmentStatus[];
}

export interface PatientSummary {
  id: number;
  mrn: string;
  full_name: string;
  phone: string | null;
  email?: string | null;
  age?: number | null;
  gender?: string | null;
  status?: string;
  photo_url?: string | null;
}

export interface Patient extends PatientSummary {
  first_name: string;
  last_name: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  occupation: string | null;
  referred_by: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  medical_history?: string | null;
  allergies?: string | null;
  notes: string | null;
  primary_branch_id: number;
  primary_practitioner?: { id: number; name: string } | null;
  created_at: string;
}

export interface DocumentFile {
  id: number;
  category: string;
  original_name: string;
  mime: string;
  size: number;
  uploaded_by?: { id: number; name: string } | null;
  created_at: string;
}

export interface Invoice {
  id: number;
  number: string | null;
  status: 'draft' | 'posted' | 'void' | 'credited';
  payment_status: 'paid' | 'partially_paid' | 'unpaid' | null;
  issue_date: string | null;
  due_date: string | null;
  total_minor: number;
  amount_paid_minor: number;
  balance_minor: number;
  patient?: { id: number; full_name: string; mrn: string };
  items?: { id: number; description: string; quantity: number; unit_price_minor: number; total_minor: number }[];
  payments?: { id: number; amount_minor: number; method: string; received_at: string; reference: string | null; type: string }[];
}

export interface AttendanceToday {
  date: string;
  status: string | null;
  check_in: string | null;
  check_out: string | null;
  minutes_worked: number | null;
  is_late: boolean;
  on_leave: 'full' | 'am' | 'pm' | null;
  can_check_in: boolean;
  can_check_out: boolean;
  check_in_distance_m: number | null;
  geofence: { required: boolean; sites: { branch_id: number; name: string; latitude: number; longitude: number; radius_m: number }[] };
}

export interface LeaveRequest {
  id: number;
  user?: { id: number; name: string; color?: string };
  leave_type?: { id: number; name: string; code: string; color: string };
  start_date: string;
  end_date: string;
  half_day: 'am' | 'pm' | null;
  days: number | string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  decision_note?: string | null;
  can_cancel?: boolean;
  can_decide?: boolean;
}

export interface LeaveBalance { leave_type_id: number; name: string; code: string; color: string; is_paid: boolean; quota: number | string; used: number; pending: number; remaining: number | null }

export interface Presence { state: 'in' | 'out' | 'leave' | 'absent'; check_in: string | null; check_out: string | null; is_late: boolean; leave: string | null }

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  color: string;
  roles?: string[];
  is_active: boolean;
  is_practitioner: boolean;
  employee_code?: string | null;
  last_login_at?: string | null;
}

export interface OnlineBooking {
  id: number;
  reference: string;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
  source: string;
  local_start: string;
  duration_minutes: number;
  name: string;
  phone: string;
  email: string | null;
  age: number | null;
  message: string | null;
  branch: { id: number; name: string };
  service: { id: number; name: string } | null;
  practitioner: { id: number; name: string } | null;
  patient: { id: number; full_name: string } | null;
  created_at: string;
}
