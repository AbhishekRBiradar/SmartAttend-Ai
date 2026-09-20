export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'DEPARTMENT_ADMIN' | 'TEACHER' | 'STUDENT';

export type Status = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'DELETED';

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED' | 'Present' | 'Late' | 'Absent' | 'Excused' | string;

export type RecognitionMethod = 'FACE_AI' | 'MANUAL' | 'QR' | 'BIOMETRIC' | 'RFID' | string;

export type NotificationType = 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS' | 'ATTENDANCE' | 'EXAM' | 'SYSTEM' | string;

export interface User {
  user_id: string;
  id?: string;
  name: string;
  email: string;
  role: Role;
  status?: Status;
  department_id?: string;
  department?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Student {
  id: string;
  user_id?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  usn?: string;
  registrationNumber?: string;
  department_id?: string;
  department?: string;
  program_id?: string;
  program?: string;
  batch_id?: string;
  batch?: string;
  current_academic_year_id?: string;
  current_semester_id?: string;
  semester?: string | number;
  current_section_id?: string;
  section?: string;
  year?: string | number;
  images?: number;
  profilePic?: string;
  modeOfAdmission?: string;
  dateOfAdmission?: string;
  dateOfBirth?: string;
  contactNumber?: string;
  guardianName?: string;
  guardianContact?: string;
  status?: Status | string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Teacher {
  id: string;
  teacher_id?: string;
  user_id?: string;
  employee_id?: string;
  name: string;
  email: string;
  department_id?: string;
  department?: string;
  designation?: string;
  status?: Status;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Department {
  id: string;
  name?: string;
  code?: string;
  department_name?: string;
  department_code?: string;
  description?: string;
  head_of_department?: string;
  status?: Status | any;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Program {
  id: string;
  department_id?: string;
  name?: string;
  code?: string;
  program_name?: string;
  program_code?: string;
  degree_type?: string;
  duration_years?: number;
  total_semesters?: number;
  status?: Status | any;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface AcademicYear {
  id: string;
  name?: string;
  year_name?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  status?: Status | any;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Batch {
  id: string;
  program_id?: string;
  department_id?: string;
  name?: string;
  batch_name?: string;
  start_year?: number;
  end_year?: number;
  status?: Status | any;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Semester {
  id: string;
  program_id?: string;
  academic_year_id?: string;
  semester_number?: number;
  name?: string;
  semester_name?: string;
  status?: Status | any;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Section {
  id: string;
  semester_id?: string;
  program_id?: string;
  department_id?: string;
  name?: string;
  section_name?: string;
  max_capacity?: number;
  status?: Status | any;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Course {
  id: string;
  course_id?: string;
  course_code?: string;
  course_name?: string;
  code?: string;
  name?: string;
  department_id?: string;
  credits?: number;
  semester?: number | string;
  description?: string;
  status?: Status | any;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface CourseOffering {
  id: string;
  offering_id?: string;
  course_id?: string;
  course_code?: string;
  course_name?: string;
  department_id?: string;
  teacher_id?: string;
  teacher_name?: string;
  semester_id?: string;
  section_id?: string;
  section?: string;
  academic_year_id?: string;
  status?: Status | any;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_offering_id: string;
  course_id?: string;
  enrollment_date?: string;
  status?: 'ENROLLED' | 'DROPPED' | 'COMPLETED' | 'INACTIVE' | string;
  grade?: string;
  marks?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Timetable {
  id: string;
  timetable_id?: string;
  course_offering_id?: string;
  course_id?: string;
  course_name?: string;
  teacher_id?: string;
  teacher_name?: string;
  department_id?: string;
  section_id?: string;
  semester_id?: string;
  day_of_week?: string | number;
  start_time?: string;
  end_time?: string;
  room_number?: string;
  room?: string;
  status?: Status | any;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface ClassSession {
  id: string;
  course_offering_id?: string;
  timetable_id?: string;
  teacher_id?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
  room_number?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | string;
  topic?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Attendance {
  id: string;
  session_id?: string;
  class_session_id?: string;
  student_id: string;
  student_name?: string;
  studentName?: string;
  studentRoll?: string;
  department?: string;
  courseCode?: string;
  courseName?: string;
  section?: any;
  room?: any;
  sessionDate?: string;
  course_offering_id?: string;
  course_id?: string;
  date: string;
  timestamp: string;
  status: AttendanceStatus;
  method?: RecognitionMethod;
  recognition_method?: RecognitionMethod;
  similarity?: number;
  similarity_score?: number;
  confidence?: number;
  marked_by?: string;
  modification_reason?: string;
  period?: string;
  verification_status?: 'VERIFIED' | 'FLAGGED' | 'MANUAL';
  verified_by?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Exam {
  id: string;
  exam_id?: string;
  name?: string;
  exam_type?: string;
  course_offering_id?: string;
  course_id?: string;
  department_id?: string;
  semester_id?: string;
  academic_year_id?: string;
  date?: string;
  max_marks?: number;
  passing_marks?: number;
  status?: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Result {
  id: string;
  result_id?: string;
  exam_id?: string;
  student_id?: string;
  student_name?: string;
  course_offering_id?: string;
  course_id?: string;
  marks_obtained?: number;
  marks?: number;
  max_marks?: number;
  maximum_marks?: number;
  percentage?: number;
  grade?: string;
  grade_point?: number;
  status?: 'PASS' | 'FAIL' | 'PENDING' | string;
  result_status?: 'PASS' | 'FAIL' | string;
  is_published?: boolean;
  published?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Notification {
  id: string;
  notification_id?: string;
  title?: string;
  message?: string;
  type?: NotificationType;
  recipient_id?: string;
  recipient_role?: Role | 'ALL' | string;
  department_id?: string;
  status?: 'UNREAD' | 'READ' | string;
  link?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface AiRecognitionResult {
  student_id?: string | null;
  student_name?: string;
  name?: string;
  similarity?: number;
  confidence?: number;
  status?: AttendanceStatus | 'UNKNOWN' | 'REJECTED' | string;
  recognition_status?: string;
  enrollment_status?: string;
  attendance_status?: string;
  message?: string;
  timestamp?: string;
  record?: Attendance;
  [key: string]: any;
}
