import { triggerRulesModal } from '../utils/firebaseErrorHandler';
import { User, Role, Status, Student, Teacher, Course, CourseOffering, Enrollment, Timetable, ClassSession, Attendance, AttendanceStatus, RecognitionMethod, Exam, Result, Notification, NotificationType, AiRecognitionResult } from "../types";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, where, limit, getDocFromServer, setLogLevel, increment, getDocs } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { auth } from '../firebase';
import { normalizeStudent } from '../utils/studentMigration';
import { cleanObject, uniqueDocs } from '../utils/firestoreUtils';

export { cleanObject, uniqueDocs };

// Disable noisy firestore logs
setLogLevel('silent');

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes('Missing or insufficient permissions') || errMsg.includes('permission-denied')) {
    triggerRulesModal();
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
  if (operationType !== OperationType.GET) {
    alert('Database Error: ' + errInfo.error + '\n\nPlease check your Firebase Security Rules.');
    throw error;
  }
};



export interface DatasetImage {
  id: string;
  url: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  department: string;
  subject: string;
  loginTime: string;
  logoutTime: string | null;
  date: string;
  duration: string | null;
  status: 'Present' | 'Late' | 'Absent';
}

export interface UnknownPerson {
  id: string;
  imageUrl: string;
  time: string;
  date?: string;
  status: 'Pending' | 'Approved' | 'Ignored';
}

export interface ClassPeriod {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  teacherId?: string;
}

export interface CameraConfig {
  id: string;
  name: string;
  deviceId?: string;
  resolution: '720p' | '1080p' | '4k';
  frameRate: number;
  assignedClass: string;
  timetable: ClassPeriod[];
}


export interface DeletedRecord {
  id: string; // Document ID in deletedRecords
  originalId: string;
  type: 'user' | 'student';
  userData?: any;
  studentData?: any;
  attendanceLogs?: any[];
  deletedAt: string; // ISO string
}


export interface SystemSettings {
  confidenceThreshold: number;
  matchThreshold?: number;
  consistentFrames?: number;
  blinkThreshold: number;
  autoLogoutTime: number;
  cameraResolution: string; // Legacy fallback
  cameraSource?: string; // Legacy fallback
  frameRate?: number; // Legacy fallback
  enableNotifications: boolean;
  lateEntryTime: string;
  lateEntryGracePeriod: number;
  timetable: ClassPeriod[]; // Legacy fallback
  cameras: CameraConfig[];
  aiResolution?: string;
  aiProvider?: string;
}

export interface AuditLog {
  id?: string;
  action: string;
  details: string;
  userId: string;
  userEmail: string;
  timestamp: string;
}

interface DataContextType {
  students: Student[];
  teachers: Teacher[];
  users: User[];
  courses: Course[];
  courseOfferings: CourseOffering[];
  enrollments: Enrollment[];
  timetables: Timetable[];
  classSessions: ClassSession[];
  activeSession: ClassSession | null;
  attendances: Attendance[];
  setActiveSession: (session: ClassSession | null) => void;
  addTimetable: (slot: Omit<Timetable, 'id'>) => Promise<void>;
  updateTimetable: (id: string, data: Partial<Timetable>) => Promise<void>;
  deleteTimetable: (id: string) => Promise<void>;
  startClassSession: (timetableSlotOrOfferingId: string | Timetable, teacherIdOrRoom?: string, extraParam?: string) => Promise<ClassSession>;
  endClassSession: (sessionId: string) => Promise<void>;
  cancelClassSession: (sessionId: string) => Promise<void>;
  markSessionAttendance: (
    sessionIdOrParams: string | {
      sessionId: string;
      studentId: string;
      status: AttendanceStatus;
      method?: RecognitionMethod;
      similarity?: number;
      forceOverride?: boolean;
      period?: string;
      reason?: string;
    },
    studentId?: string,
    status?: AttendanceStatus,
    method?: RecognitionMethod,
    similarity?: number
  ) => Promise<{ success: boolean; code?: string; message?: string; record?: Attendance }>;
  updateAttendanceRecord: (id: string, data: Partial<Attendance> & { reason?: string }) => Promise<void>;
  processAiRecognitionToAttendance: (params: {
    student_id?: string | null;
    similarity?: number;
    session_id?: string;
    quality_score?: number;
    temporal_score?: number;
  }) => Promise<AiRecognitionResult>;
  deleteAttendanceRecord: (id: string) => Promise<void>;
  getAttendancesBySession: (sessionId: string) => Attendance[];
  getAttendancesByStudent: (studentId: string) => Attendance[];
  getAttendancesByCourseOffering: (courseOfferingId: string) => Attendance[];
  addEnrollment: (enrollment: Partial<Enrollment>) => Promise<void>;
  deleteEnrollment: (id: string) => Promise<void>;
  deletedRecords: DeletedRecord[];
  attendanceLogs: AttendanceRecord[];
  unknownPersons: UnknownPerson[];
  exams: Exam[];
  results: Result[];
  addExam: (exam: Omit<Exam, 'id'>) => Promise<string>;
  updateExam: (id: string, data: Partial<Exam>) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  saveResult: (data: { student_id: string; course_offering_id: string; exam_id: string; marks: number; maximum_marks: number; reason?: string; isPublished?: boolean }) => Promise<Result>;
  addResult?: (data: any) => Promise<any>;
  updateResult?: (id: string, data: any) => Promise<any>;
  saveBatchResults: (records: Array<{ student_id: string; course_offering_id: string; exam_id: string; marks: number; maximum_marks: number }>, isPublished?: boolean, reason?: string) => Promise<void>;
  publishResults: (resultIds: string[]) => Promise<void>;
  unpublishResults: (resultIds: string[]) => Promise<void>;
  deleteResult: (id: string) => Promise<void>;
  calculateGrade: (marks: number, maxMarks?: number) => { grade: string; grade_point: number; status: 'PASS' | 'FAIL' };
  auditLogs: AuditLog[];
  settings: SystemSettings;
  addAuditLog: (action: string, details: string) => Promise<void>;
  addTeacher: (teacher: Teacher) => Promise<void>;
  updateTeacher: (id: string, data: Partial<Teacher>) => Promise<void>;
  deleteTeacher: (id: string) => Promise<void>;
  addStudent: (student: Omit<Student, 'images'>) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  addUser: (user: any) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  restoreRecord: (id: string) => Promise<void>;
  deleteRecordPermanently: (id: string) => Promise<void>;
  addCourse: (course: Omit<Course, 'id'>) => Promise<void>;
  addCourseOffering: (offering: Omit<CourseOffering, 'id'>) => Promise<void>;
  updateCourse: (id: string, data: Partial<Course>) => Promise<void>;
  updateCourseOffering: (id: string, data: Partial<CourseOffering>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  deleteCourseOffering: (id: string) => Promise<void>;
  simulateDetection: () => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  simulateAutoLogout: () => void;
  addAttendanceLog: (log: Omit<AttendanceRecord, 'id'>) => void;
  updateStudentImages: (id: string, count: number) => void;
  addDatasetImage: (studentId: string, url: string) => Promise<void>;
  deleteDatasetImage: (studentId: string, imageId: string) => Promise<void>;
  seedSampleData: () => Promise<void>;
  purgePreloadedData: () => Promise<void>;
  updateUnknownPersonStatus: (id: string, status: UnknownPerson['status']) => void;
  addUnknownPerson: (person: Omit<UnknownPerson, 'id'>) => void;
  notifications: Notification[];
  sendNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'status'> & { id?: string; created_at?: string; status?: 'UNREAD' | 'READ' }) => Promise<Notification>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: (recipientId?: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  getUserNotifications: (userId?: string, role?: string, departmentId?: string) => Notification[];
  getUserUnreadCount: (userId?: string, role?: string, departmentId?: string) => number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialUnknowns: UnknownPerson[] = [
  {
    id: 'U001',
    imageUrl: '',
    time: '10:15 AM',
    date: new Date().toISOString().split('T')[0],
    status: 'Pending',
  },
];

const defaultSettings: SystemSettings = {
  confidenceThreshold: 0.85,
  matchThreshold: 0.45,
  consistentFrames: 3,
  blinkThreshold: 0.5,
  autoLogoutTime: 10,
  cameraResolution: '1080p',
  enableNotifications: true,
  lateEntryTime: '09:30',
  lateEntryGracePeriod: 10,
  timetable: [
    { id: '1', subject: 'First Period', startTime: '09:00', endTime: '10:00' },
    { id: '2', subject: 'Second Period', startTime: '10:00', endTime: '11:00' },
  ],
  cameras: [
    {
      id: 'cam-1',
      name: 'Camera 1 - Room 101',
      resolution: '1080p',
      frameRate: 30,
      assignedClass: 'Computer Science',
      timetable: [
        { id: '1-1', subject: 'Data Structures', startTime: '09:00', endTime: '10:00' },
        { id: '1-2', subject: 'Algorithms', startTime: '10:00', endTime: '11:00' },
      ],
    },
    {
      id: 'cam-2',
      name: 'Camera 2 - Room 102',
      resolution: '720p',
      frameRate: 15,
      assignedClass: 'Information Technology',
      timetable: [
        { id: '2-1', subject: 'Database Systems', startTime: '09:00', endTime: '10:30' },
        { id: '2-2', subject: 'Web Development', startTime: '10:30', endTime: '12:00' },
      ],
    }
  ],
  aiResolution: '1280x720',
  aiProvider: 'auto'
};

// --- Canonical Interlinked Datasets for Consistent Portal Synchronization ---
export const canonicalTeachers: Teacher[] = [
  {
    id: 'FAC-CSE-01',
    teacher_id: 'FAC-CSE-01',
    user_id: 'T001',
    employee_id: 'EMP-FAC-01',
    name: 'Dr. Robert Jenkins',
    email: 'teacher@smartattend.ai',
    department_id: 'dept-cse',
    department: 'Computer Science & Engineering',
    designation: 'Professor & Head of Department',
    qualification: 'Ph.D. in Distributed Systems & Cloud Architectures (MIT)',
    specialization: 'Distributed Computing, OS Kernel internals, High Performance Computing',
    phone: '+91 98765 43210',
    contactNumber: '+91 98765 43210',
    office_location: 'Academic Block B, Cabin 304',
    cabin: 'Academic Block B, Cabin 304',
    office_hours: 'Mon - Thu, 2:00 PM - 4:00 PM',
    joining_date: '2019-08-01',
    joiningDate: '2019-08-01',
    bio: 'Distinguished Professor with 15+ years of research and teaching experience. Leads university research in distributed virtualization and operating system kernels.',
    status: 'ACTIVE' as Status
  },
  {
    id: 'FAC-CSE-02',
    teacher_id: 'FAC-CSE-02',
    user_id: 'T002',
    employee_id: 'EMP-FAC-02',
    name: 'Dr. Sarah Mitchell',
    email: 'sarah.mitchell@university.edu',
    department_id: 'dept-cse',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
    qualification: 'Ph.D. in Artificial Intelligence & Computer Vision (Stanford)',
    specialization: 'Machine Learning, Deep Neural Networks, Biometrics & Pattern Recognition',
    phone: '+91 98765 43211',
    contactNumber: '+91 98765 43211',
    office_location: 'Academic Block B, Cabin 308',
    cabin: 'Academic Block B, Cabin 308',
    office_hours: 'Tue - Fri, 11:00 AM - 1:00 PM',
    joining_date: '2021-07-15',
    joiningDate: '2021-07-15',
    bio: 'Associate Professor focusing on modern deep learning paradigms, real-time facial recognition algorithms, and neural representations.',
    status: 'ACTIVE' as Status
  },
  {
    id: 'FAC-CSE-03',
    teacher_id: 'FAC-CSE-03',
    user_id: 'T003',
    employee_id: 'EMP-FAC-03',
    name: 'Prof. Alan Sharma',
    email: 'alan.sharma@university.edu',
    department_id: 'dept-cse',
    department: 'Computer Science & Engineering',
    designation: 'Assistant Professor',
    qualification: 'M.Tech in Computer Science & Engineering (IIT Bombay)',
    specialization: 'Computer Networks, Cryptographic Protocols, Network Security',
    phone: '+91 98765 43212',
    contactNumber: '+91 98765 43212',
    office_location: 'Academic Block B, Cabin 312',
    cabin: 'Academic Block B, Cabin 312',
    office_hours: 'Mon - Fri, 3:00 PM - 5:00 PM',
    joining_date: '2022-01-10',
    joiningDate: '2022-01-10',
    bio: 'Assistant Professor specializing in next-generation network architectures, packet routing algorithms, and wireless security frameworks.',
    status: 'ACTIVE' as Status
  },
  {
    id: 'FAC-ISE-01',
    teacher_id: 'FAC-ISE-01',
    user_id: 'T004',
    employee_id: 'EMP-FAC-04',
    name: 'Dr. Emily Watson',
    email: 'emily.watson@university.edu',
    department_id: 'dept-cse',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
    qualification: 'Ph.D. in Big Data Systems & Databases (IISc Bangalore)',
    specialization: 'Relational Database Optimization, Distributed SQL Engines, ACID Concurrency',
    phone: '+91 98765 43213',
    contactNumber: '+91 98765 43213',
    office_location: 'Academic Block C, Cabin 201',
    cabin: 'Academic Block C, Cabin 201',
    office_hours: 'Wed - Fri, 10:00 AM - 12:00 PM',
    joining_date: '2020-09-01',
    joiningDate: '2020-09-01',
    bio: 'Expert researcher in query execution plans, storage engines, transactional integrity, and large-scale data engineering.',
    status: 'ACTIVE' as Status
  }
];

export const canonicalCourses: Course[] = [
  {
    id: 'CRS-CS301',
    course_id: 'CRS-CS301',
    course_code: 'CS301',
    course_name: 'Operating Systems & Kernel Architecture',
    department_id: 'dept-cse',
    program_id: 'prog-btech-cse',
    semester: 4,
    credits: 4,
    course_type: 'Core',
    description: 'Process synchronization, thread scheduling, virtual memory paging, file systems, device drivers, and Unix kernel internals.',
    status: 'ACTIVE' as Status
  },
  {
    id: 'CRS-CS302',
    course_id: 'CRS-CS302',
    course_code: 'CS302',
    course_name: 'Database Management Systems',
    department_id: 'dept-cse',
    program_id: 'prog-btech-cse',
    semester: 4,
    credits: 4,
    course_type: 'Core',
    description: 'Relational model, SQL query optimization, B+ tree indexing, transaction management, multi-version concurrency control, and ACID semantics.',
    status: 'ACTIVE' as Status
  },
  {
    id: 'CRS-CS303',
    course_id: 'CRS-CS303',
    course_code: 'CS303',
    course_name: 'Artificial Intelligence & Neural Networks',
    department_id: 'dept-cse',
    program_id: 'prog-btech-cse',
    semester: 4,
    credits: 4,
    course_type: 'Core',
    description: 'Heuristic search algorithms, neural network backpropagation, computer vision, face embedding generation, and reinforcement learning.',
    status: 'ACTIVE' as Status
  },
  {
    id: 'CRS-CS304',
    course_id: 'CRS-CS304',
    course_code: 'CS304',
    course_name: 'Computer Networks & Security',
    department_id: 'dept-cse',
    program_id: 'prog-btech-cse',
    semester: 4,
    credits: 3,
    course_type: 'Core',
    description: 'OSI and TCP/IP protocol stack, congestion control, packet routing algorithms, TLS cryptographic handshakes, and network packet analysis.',
    status: 'ACTIVE' as Status
  },
  {
    id: 'CRS-CS305',
    course_id: 'CRS-CS305',
    course_code: 'CS305',
    course_name: 'Software Engineering & Cloud Architecture',
    department_id: 'dept-cse',
    program_id: 'prog-btech-cse',
    semester: 4,
    credits: 3,
    course_type: 'Elective',
    description: 'Agile sprints, microservices architecture, automated CI/CD pipelines, containerization, and distributed system design patterns.',
    status: 'ACTIVE' as Status
  }
];

export const canonicalCourseOfferings: CourseOffering[] = [
  {
    id: 'OFF-CS301-A',
    course_offering_id: 'OFF-CS301-A',
    course_id: 'CRS-CS301',
    course_code: 'CS301',
    course_name: 'Operating Systems & Kernel Architecture',
    teacher_id: 'FAC-CSE-01',
    teacher_name: 'Dr. Robert Jenkins',
    department_id: 'dept-cse',
    program_id: 'prog-btech-cse',
    batch_id: 'batch-2023-2027',
    academic_year_id: 'ay-2024-2025',
    semester_id: 'sem-4',
    section_id: 'sec-a',
    status: 'ACTIVE' as Status
  },
  {
    id: 'OFF-CS302-A',
    course_offering_id: 'OFF-CS302-A',
    course_id: 'CRS-CS302',
    course_code: 'CS302',
    course_name: 'Database Management Systems',
    teacher_id: 'FAC-ISE-01',
    teacher_name: 'Dr. Emily Watson',
    department_id: 'dept-cse',
    program_id: 'prog-btech-cse',
    batch_id: 'batch-2023-2027',
    academic_year_id: 'ay-2024-2025',
    semester_id: 'sem-4',
    section_id: 'sec-a',
    status: 'ACTIVE' as Status
  },
  {
    id: 'OFF-CS303-A',
    course_offering_id: 'OFF-CS303-A',
    course_id: 'CRS-CS303',
    course_code: 'CS303',
    course_name: 'Artificial Intelligence & Neural Networks',
    teacher_id: 'FAC-CSE-02',
    teacher_name: 'Dr. Sarah Mitchell',
    department_id: 'dept-cse',
    program_id: 'prog-btech-cse',
    batch_id: 'batch-2023-2027',
    academic_year_id: 'ay-2024-2025',
    semester_id: 'sem-4',
    section_id: 'sec-a',
    status: 'ACTIVE' as Status
  },
  {
    id: 'OFF-CS304-A',
    course_offering_id: 'OFF-CS304-A',
    course_id: 'CRS-CS304',
    course_code: 'CS304',
    course_name: 'Computer Networks & Security',
    teacher_id: 'FAC-CSE-03',
    teacher_name: 'Prof. Alan Sharma',
    department_id: 'dept-cse',
    program_id: 'prog-btech-cse',
    batch_id: 'batch-2023-2027',
    academic_year_id: 'ay-2024-2025',
    semester_id: 'sem-4',
    section_id: 'sec-a',
    status: 'ACTIVE' as Status
  }
];

export const canonicalStudents: Student[] = [
  {
    id: 'S001',
    student_id: 'S001',
    user_id: 'S001',
    name: 'Abhi Kumar Sharma',
    firstName: 'Abhi',
    middleName: 'Kumar',
    lastName: 'Sharma',
    registrationNumber: 'REG2023001',
    usn: '1RV23CS001',
    modeOfAdmission: 'Government',
    dateOfAdmission: '2023-08-15',
    dateOfBirth: '2005-04-20',
    gender: 'Male',
    bloodGroup: 'O+',
    religion: 'Hindu',
    casteName: 'General',
    casteCategory: 'GM',
    email: 'student@smartattend.ai',
    phone: '+91 9876543210',
    academicYear: '2nd Year / 4th Sem',
    courseAdopted: 'B.Tech Computer Science & Engineering',
    motherName: 'Sunita Sharma',
    motherContact: '+91 9876543211',
    fatherName: 'Rajesh Sharma',
    fatherContact: '+91 9876543212',
    address: '123, Innovation Boulevard, Silicon Enclave, Bangalore, Karnataka - 560001',
    department_id: 'dept-cse',
    department: 'Computer Science & Engineering',
    program_id: 'prog-btech-cse',
    batch_id: 'batch-2023-2027',
    current_semester_id: 'sem-4',
    current_section_id: 'sec-a',
    current_academic_year_id: 'ay-2024-2025',
    semester: 'Semester 4',
    year: '2nd Year',
    images: 15,
    status: 'ACTIVE' as Status
  },
  {
    id: 'S002',
    student_id: 'S002',
    user_id: 'S002',
    name: 'Priya Sharma',
    firstName: 'Priya',
    lastName: 'Sharma',
    registrationNumber: 'REG2023002',
    usn: '1RV23CS002',
    email: 'priya.sharma@example.com',
    department_id: 'dept-cse',
    department: 'Computer Science & Engineering',
    program_id: 'prog-btech-cse',
    batch_id: 'batch-2023-2027',
    current_semester_id: 'sem-4',
    current_section_id: 'sec-a',
    current_academic_year_id: 'ay-2024-2025',
    semester: 'Semester 4',
    year: '2nd Year',
    images: 12,
    status: 'ACTIVE' as Status
  },
  {
    id: 'S003',
    student_id: 'S003',
    user_id: 'S003',
    name: 'Rahul Verma',
    firstName: 'Rahul',
    lastName: 'Verma',
    registrationNumber: 'REG2023003',
    usn: '1RV23CS003',
    email: 'rahul.verma@example.com',
    department_id: 'dept-cse',
    department: 'Computer Science & Engineering',
    program_id: 'prog-btech-cse',
    batch_id: 'batch-2023-2027',
    current_semester_id: 'sem-4',
    current_section_id: 'sec-a',
    current_academic_year_id: 'ay-2024-2025',
    semester: 'Semester 4',
    year: '2nd Year',
    images: 10,
    status: 'ACTIVE' as Status
  },
  {
    id: 'S004',
    student_id: 'S004',
    user_id: 'S004',
    name: 'Sneha Reddy',
    firstName: 'Sneha',
    lastName: 'Reddy',
    registrationNumber: 'REG2023004',
    usn: '1RV23CS004',
    email: 'sneha.reddy@example.com',
    department_id: 'dept-cse',
    department: 'Computer Science & Engineering',
    program_id: 'prog-btech-cse',
    batch_id: 'batch-2023-2027',
    current_semester_id: 'sem-4',
    current_section_id: 'sec-a',
    current_academic_year_id: 'ay-2024-2025',
    semester: 'Semester 4',
    year: '2nd Year',
    images: 18,
    status: 'ACTIVE' as Status
  },
  {
    id: 'S005',
    student_id: 'S005',
    user_id: 'S005',
    name: 'Arjun Singh',
    firstName: 'Arjun',
    lastName: 'Singh',
    registrationNumber: 'REG2023005',
    usn: '1RV23CS005',
    email: 'arjun.singh@example.com',
    department_id: 'dept-cse',
    department: 'Computer Science & Engineering',
    program_id: 'prog-btech-cse',
    batch_id: 'batch-2023-2027',
    current_semester_id: 'sem-4',
    current_section_id: 'sec-a',
    current_academic_year_id: 'ay-2024-2025',
    semester: 'Semester 4',
    year: '2nd Year',
    images: 8,
    status: 'ACTIVE' as Status
  }
];

export const canonicalEnrollments: Enrollment[] = [
  { id: 'ENR-S001-CS301', enrollment_id: 'ENR-S001-CS301', student_id: 'S001', course_offering_id: 'OFF-CS301-A', academic_year_id: 'ay-2024-2025', semester_id: 'sem-4', section_id: 'sec-a', status: 'ACTIVE' as Status },
  { id: 'ENR-S001-CS302', enrollment_id: 'ENR-S001-CS302', student_id: 'S001', course_offering_id: 'OFF-CS302-A', academic_year_id: 'ay-2024-2025', semester_id: 'sem-4', section_id: 'sec-a', status: 'ACTIVE' as Status },
  { id: 'ENR-S001-CS303', enrollment_id: 'ENR-S001-CS303', student_id: 'S001', course_offering_id: 'OFF-CS303-A', academic_year_id: 'ay-2024-2025', semester_id: 'sem-4', section_id: 'sec-a', status: 'ACTIVE' as Status },
  { id: 'ENR-S001-CS304', enrollment_id: 'ENR-S001-CS304', student_id: 'S001', course_offering_id: 'OFF-CS304-A', academic_year_id: 'ay-2024-2025', semester_id: 'sem-4', section_id: 'sec-a', status: 'ACTIVE' as Status },
  { id: 'ENR-S002-CS301', enrollment_id: 'ENR-S002-CS301', student_id: 'S002', course_offering_id: 'OFF-CS301-A', academic_year_id: 'ay-2024-2025', semester_id: 'sem-4', section_id: 'sec-a', status: 'ACTIVE' as Status },
  { id: 'ENR-S002-CS302', enrollment_id: 'ENR-S002-CS302', student_id: 'S002', course_offering_id: 'OFF-CS302-A', academic_year_id: 'ay-2024-2025', semester_id: 'sem-4', section_id: 'sec-a', status: 'ACTIVE' as Status },
  { id: 'ENR-S003-CS301', enrollment_id: 'ENR-S003-CS301', student_id: 'S003', course_offering_id: 'OFF-CS301-A', academic_year_id: 'ay-2024-2025', semester_id: 'sem-4', section_id: 'sec-a', status: 'ACTIVE' as Status },
  { id: 'ENR-S004-CS303', enrollment_id: 'ENR-S004-CS303', student_id: 'S004', course_offering_id: 'OFF-CS303-A', academic_year_id: 'ay-2024-2025', semester_id: 'sem-4', section_id: 'sec-a', status: 'ACTIVE' as Status },
  { id: 'ENR-S005-CS304', enrollment_id: 'ENR-S005-CS304', student_id: 'S005', course_offering_id: 'OFF-CS304-A', academic_year_id: 'ay-2024-2025', semester_id: 'sem-4', section_id: 'sec-a', status: 'ACTIVE' as Status }
];

export const canonicalTimetables: Timetable[] = [
  // Monday
  { id: 'TT-MON-1', timetable_id: 'TT-MON-1', course_offering_id: 'OFF-CS301-A', course_id: 'CRS-CS301', course_name: 'Operating Systems & Kernel Architecture', teacher_id: 'FAC-CSE-01', teacher_name: 'Dr. Robert Jenkins', day_of_week: 'Monday', start_time: '09:00', end_time: '10:00', room: 'Lecture Hall 102', room_number: 'LH-102', status: 'ACTIVE' as Status },
  { id: 'TT-MON-2', timetable_id: 'TT-MON-2', course_offering_id: 'OFF-CS302-A', course_id: 'CRS-CS302', course_name: 'Database Management Systems', teacher_id: 'FAC-ISE-01', teacher_name: 'Dr. Emily Watson', day_of_week: 'Monday', start_time: '10:00', end_time: '11:00', room: 'Database Lab 204', room_number: 'DB-LAB-204', status: 'ACTIVE' as Status },
  { id: 'TT-MON-3', timetable_id: 'TT-MON-3', course_offering_id: 'OFF-CS303-A', course_id: 'CRS-CS303', course_name: 'Artificial Intelligence & Neural Networks', teacher_id: 'FAC-CSE-02', teacher_name: 'Dr. Sarah Mitchell', day_of_week: 'Monday', start_time: '11:30', end_time: '12:30', room: 'Smart Classroom 305', room_number: 'SC-305', status: 'ACTIVE' as Status },
  { id: 'TT-MON-4', timetable_id: 'TT-MON-4', course_offering_id: 'OFF-CS304-A', course_id: 'CRS-CS304', course_name: 'Computer Networks & Security', teacher_id: 'FAC-CSE-03', teacher_name: 'Prof. Alan Sharma', day_of_week: 'Monday', start_time: '14:00', end_time: '15:30', room: 'Networks Lab 101', room_number: 'NET-101', status: 'ACTIVE' as Status },
  // Tuesday
  { id: 'TT-TUE-1', timetable_id: 'TT-TUE-1', course_offering_id: 'OFF-CS303-A', course_id: 'CRS-CS303', course_name: 'Artificial Intelligence & Neural Networks', teacher_id: 'FAC-CSE-02', teacher_name: 'Dr. Sarah Mitchell', day_of_week: 'Tuesday', start_time: '09:00', end_time: '10:00', room: 'Smart Classroom 305', room_number: 'SC-305', status: 'ACTIVE' as Status },
  { id: 'TT-TUE-2', timetable_id: 'TT-TUE-2', course_offering_id: 'OFF-CS301-A', course_id: 'CRS-CS301', course_name: 'Operating Systems & Kernel Architecture', teacher_id: 'FAC-CSE-01', teacher_name: 'Dr. Robert Jenkins', day_of_week: 'Tuesday', start_time: '10:00', end_time: '11:00', room: 'Lecture Hall 102', room_number: 'LH-102', status: 'ACTIVE' as Status },
  { id: 'TT-TUE-3', timetable_id: 'TT-TUE-3', course_offering_id: 'OFF-CS304-A', course_id: 'CRS-CS304', course_name: 'Computer Networks & Security', teacher_id: 'FAC-CSE-03', teacher_name: 'Prof. Alan Sharma', day_of_week: 'Tuesday', start_time: '11:30', end_time: '12:30', room: 'Lecture Hall 102', room_number: 'LH-102', status: 'ACTIVE' as Status },
  // Wednesday
  { id: 'TT-WED-1', timetable_id: 'TT-WED-1', course_offering_id: 'OFF-CS304-A', course_id: 'CRS-CS304', course_name: 'Computer Networks & Security', teacher_id: 'FAC-CSE-03', teacher_name: 'Prof. Alan Sharma', day_of_week: 'Wednesday', start_time: '09:00', end_time: '10:00', room: 'Lecture Hall 102', room_number: 'LH-102', status: 'ACTIVE' as Status },
  { id: 'TT-WED-2', timetable_id: 'TT-WED-2', course_offering_id: 'OFF-CS302-A', course_id: 'CRS-CS302', course_name: 'Database Management Systems', teacher_id: 'FAC-ISE-01', teacher_name: 'Dr. Emily Watson', day_of_week: 'Wednesday', start_time: '10:00', end_time: '11:00', room: 'Database Lab 204', room_number: 'DB-LAB-204', status: 'ACTIVE' as Status },
  { id: 'TT-WED-3', timetable_id: 'TT-WED-3', course_offering_id: 'OFF-CS301-A', course_id: 'CRS-CS301', course_name: 'Operating Systems & Kernel Architecture', teacher_id: 'FAC-CSE-01', teacher_name: 'Dr. Robert Jenkins', day_of_week: 'Wednesday', start_time: '11:30', end_time: '12:30', room: 'Lecture Hall 102', room_number: 'LH-102', status: 'ACTIVE' as Status },
  // Thursday
  { id: 'TT-THU-1', timetable_id: 'TT-THU-1', course_offering_id: 'OFF-CS303-A', course_id: 'CRS-CS303', course_name: 'Artificial Intelligence & Neural Networks', teacher_id: 'FAC-CSE-02', teacher_name: 'Dr. Sarah Mitchell', day_of_week: 'Thursday', start_time: '09:00', end_time: '10:30', room: 'AI Lab 301', room_number: 'AI-301', status: 'ACTIVE' as Status },
  { id: 'TT-THU-2', timetable_id: 'TT-THU-2', course_offering_id: 'OFF-CS301-A', course_id: 'CRS-CS301', course_name: 'Operating Systems & Kernel Architecture', teacher_id: 'FAC-CSE-01', teacher_name: 'Dr. Robert Jenkins', day_of_week: 'Thursday', start_time: '10:45', end_time: '12:15', room: 'Systems Lab 302', room_number: 'SYS-302', status: 'ACTIVE' as Status },
  // Friday
  { id: 'TT-FRI-1', timetable_id: 'TT-FRI-1', course_offering_id: 'OFF-CS302-A', course_id: 'CRS-CS302', course_name: 'Database Management Systems', teacher_id: 'FAC-ISE-01', teacher_name: 'Dr. Emily Watson', day_of_week: 'Friday', start_time: '09:00', end_time: '10:00', room: 'Database Lab 204', room_number: 'DB-LAB-204', status: 'ACTIVE' as Status },
  { id: 'TT-FRI-2', timetable_id: 'TT-FRI-2', course_offering_id: 'OFF-CS304-A', course_id: 'CRS-CS304', course_name: 'Computer Networks & Security', teacher_id: 'FAC-CSE-03', teacher_name: 'Prof. Alan Sharma', day_of_week: 'Friday', start_time: '10:00', end_time: '11:00', room: 'Lecture Hall 102', room_number: 'LH-102', status: 'ACTIVE' as Status },
  { id: 'TT-FRI-3', timetable_id: 'TT-FRI-3', course_offering_id: 'OFF-CS303-A', course_id: 'CRS-CS303', course_name: 'Artificial Intelligence & Neural Networks', teacher_id: 'FAC-CSE-02', teacher_name: 'Dr. Sarah Mitchell', day_of_week: 'Friday', start_time: '11:30', end_time: '12:30', room: 'Smart Classroom 305', room_number: 'SC-305', status: 'ACTIVE' as Status },
  // Saturday
  { id: 'TT-SAT-1', timetable_id: 'TT-SAT-1', course_offering_id: 'OFF-CS301-A', course_id: 'CRS-CS301', course_name: 'Operating Systems & Kernel Architecture', teacher_id: 'FAC-CSE-01', teacher_name: 'Dr. Robert Jenkins', day_of_week: 'Saturday', start_time: '09:30', end_time: '11:30', room: 'Auditorium 2', room_number: 'AUD-2', status: 'ACTIVE' as Status }
];

export const canonicalExams: Exam[] = [
  {
    id: 'EX-MID-2025',
    exam_id: 'EX-MID-2025',
    name: 'Mid-Semester Internal Assessment (Spring 2025)',
    exam_name: 'Mid-Semester Internal Assessment (Spring 2025)',
    exam_type: 'Internal',
    department_id: 'dept-cse',
    program_id: 'prog-btech-cse',
    academic_year_id: 'ay-2024-2025',
    semester_id: 'sem-4',
    start_date: '2025-03-10',
    end_date: '2025-03-15',
    status: 'ACTIVE' as Status
  },
  {
    id: 'EX-END-2025',
    exam_id: 'EX-END-2025',
    name: 'End-Semester Final Examination (Spring 2025)',
    exam_name: 'End-Semester Final Examination (Spring 2025)',
    exam_type: 'Semester End',
    department_id: 'dept-cse',
    program_id: 'prog-btech-cse',
    academic_year_id: 'ay-2024-2025',
    semester_id: 'sem-4',
    start_date: '2025-05-18',
    end_date: '2025-05-30',
    status: 'ACTIVE' as Status
  }
];

export const canonicalResults: Result[] = [
  {
    id: 'res-S001-OFF-CS301-A-EX-MID-2025',
    result_id: 'res-S001-OFF-CS301-A-EX-MID-2025',
    student_id: 'S001',
    course_offering_id: 'OFF-CS301-A',
    exam_id: 'EX-MID-2025',
    marks: 46,
    maximum_marks: 50,
    grade: 'O',
    grade_point: 10,
    result_status: 'PASS',
    published_at: '2025-03-20T10:00:00.000Z',
    published_by: 'Dr. Robert Jenkins'
  },
  {
    id: 'res-S001-OFF-CS302-A-EX-MID-2025',
    result_id: 'res-S001-OFF-CS302-A-EX-MID-2025',
    student_id: 'S001',
    course_offering_id: 'OFF-CS302-A',
    exam_id: 'EX-MID-2025',
    marks: 44,
    maximum_marks: 50,
    grade: 'A+',
    grade_point: 9,
    result_status: 'PASS',
    published_at: '2025-03-20T10:00:00.000Z',
    published_by: 'Dr. Emily Watson'
  },
  {
    id: 'res-S001-OFF-CS303-A-EX-MID-2025',
    result_id: 'res-S001-OFF-CS303-A-EX-MID-2025',
    student_id: 'S001',
    course_offering_id: 'OFF-CS303-A',
    exam_id: 'EX-MID-2025',
    marks: 48,
    maximum_marks: 50,
    grade: 'O',
    grade_point: 10,
    result_status: 'PASS',
    published_at: '2025-03-20T10:00:00.000Z',
    published_by: 'Dr. Sarah Mitchell'
  },
  {
    id: 'res-S001-OFF-CS304-A-EX-MID-2025',
    result_id: 'res-S001-OFF-CS304-A-EX-MID-2025',
    student_id: 'S001',
    course_offering_id: 'OFF-CS304-A',
    exam_id: 'EX-MID-2025',
    marks: 42,
    maximum_marks: 50,
    grade: 'A+',
    grade_point: 9,
    result_status: 'PASS',
    published_at: '2025-03-20T10:00:00.000Z',
    published_by: 'Prof. Alan Sharma'
  }
];

export const canonicalAttendances: Attendance[] = [
  {
    id: 'att-seed-1',
    attendance_id: 'att-seed-1',
    student_id: 'S001',
    course_offering_id: 'OFF-CS301-A',
    session_id: 'SES-INIT-01',
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    recognition_method: 'FACE_RECOGNITION',
    similarity_score: 0.98,
    marked_by: 'SYSTEM',
    timestamp: new Date().toISOString()
  },
  {
    id: 'att-seed-2',
    attendance_id: 'att-seed-2',
    student_id: 'S001',
    course_offering_id: 'OFF-CS302-A',
    session_id: 'SES-INIT-02',
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    recognition_method: 'FACE_RECOGNITION',
    similarity_score: 0.96,
    marked_by: 'SYSTEM',
    timestamp: new Date().toISOString()
  },
  {
    id: 'att-seed-3',
    attendance_id: 'att-seed-3',
    student_id: 'S001',
    course_offering_id: 'OFF-CS303-A',
    session_id: 'SES-INIT-03',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    status: 'PRESENT',
    recognition_method: 'FACE_RECOGNITION',
    similarity_score: 0.99,
    marked_by: 'SYSTEM',
    timestamp: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'att-seed-4',
    attendance_id: 'att-seed-4',
    student_id: 'S001',
    course_offering_id: 'OFF-CS304-A',
    session_id: 'SES-INIT-04',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    status: 'LATE',
    recognition_method: 'FACE_RECOGNITION',
    similarity_score: 0.94,
    marked_by: 'SYSTEM',
    timestamp: new Date(Date.now() - 86400000).toISOString()
  }
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isAuthReady } = useAuth();
  const [students, setStudents] = useState<Student[]>(canonicalStudents);
  const [teachers, setTeachers] = useState<Teacher[]>(canonicalTeachers);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>(canonicalCourses);
  const [courseOfferings, setCourseOfferings] = useState<CourseOffering[]>(canonicalCourseOfferings);
  const [enrollments, setEnrollments] = useState<Enrollment[]>(canonicalEnrollments);
  const [timetables, setTimetables] = useState<Timetable[]>(canonicalTimetables);
  const [classSessions, setClassSessions] = useState<ClassSession[]>([]);
  const [activeSession, setActiveSession] = useState<ClassSession | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>(canonicalAttendances);
  const [deletedRecords, setDeletedRecords] = useState<DeletedRecord[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [unknownPersons, setUnknownPersons] = useState<UnknownPerson[]>(initialUnknowns);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);

  const [exams, setExams] = useState<Exam[]>(canonicalExams);
  const [results, setResults] = useState<Result[]>(canonicalResults);

  const initialNotifications: Notification[] = [];

  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  useEffect(() => {
    // Connection test removed to avoid console.warns when DB is not yet created
    if (!isAuthReady || !isAuthenticated || !user) {
      setStudents([]);
      setTeachers([]);
      setUsers([]);
      setDeletedRecords([]);
      setAttendanceLogs([]);
      setAuditLogs([]);
      return;
    }

    let unsubscribeStudents: () => void;
    let unsubscribeTeachers: () => void;
    let unsubscribeUsers: () => void;
    let unsubscribeCourses: () => void;
    let unsubscribeCourseOfferings: () => void;
    let unsubscribeEnrollments: () => void;
    let unsubscribeTimetables: () => void;
    let unsubscribeClassSessions: () => void;
    let unsubscribeAttendances: () => void;
    let unsubscribeExams: () => void;
    let unsubscribeResults: () => void;
    let unsubscribeLogs: () => void;
    let unsubscribeSettings: () => void;
    let unsubscribeDeletedRecords: () => void;
    let unsubscribeAuditLogs: () => void;
    let unsubscribeNotifications: () => void;
    let unsubscribeUnknownPersons: () => void;
    
    let isMounted = true;
    let timeoutId = setTimeout(() => {
      if (!isMounted) return;

    try {
      unsubscribeNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
        const streamData = snapshot.docs.map(doc => ({ id: doc.id, notification_id: doc.id, ...doc.data() } as Notification));
        streamData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setNotifications(streamData);
      }, (e) => console.warn("Notice: notifications stream", e));
    } catch (e) {}

    // Role-based scoped Firestore subscriptions
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      unsubscribeCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
        setCourses(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course))));
      }, (e) => console.warn("Notice: courses stream", e));

      unsubscribeExams = onSnapshot(collection(db, 'exams'), (snapshot) => {
        setExams(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam))));
      }, (e) => console.warn("Notice: exams stream", e));

      unsubscribeResults = onSnapshot(collection(db, 'results'), (snapshot) => {
        setResults(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result))));
      }, (e) => console.warn("Notice: results stream", e));

      unsubscribeCourseOfferings = onSnapshot(collection(db, 'courseOfferings'), (snapshot) => {
        setCourseOfferings(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseOffering))));
      }, (e) => console.warn("Notice: courseOfferings stream", e));

      unsubscribeEnrollments = onSnapshot(collection(db, 'enrollments'), (snapshot) => {
        setEnrollments(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Enrollment))));
      }, (e) => console.warn("Notice: enrollments stream", e));

      unsubscribeTimetables = onSnapshot(collection(db, 'timetables'), (snapshot) => {
        setTimetables(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Timetable))));
      }, (e) => console.warn("Notice: timetables stream", e));

      unsubscribeClassSessions = onSnapshot(collection(db, 'classSessions'), (snapshot) => {
        const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSession));
        sessionsData.sort((a, b) => new Date(b.date + ' ' + b.start_time).getTime() - new Date(a.date + ' ' + a.start_time).getTime());
        setClassSessions(sessionsData);
        const active = sessionsData.find(s => s.status === 'ACTIVE');
        if (active) setActiveSession(active);
      }, (e) => console.warn("Notice: classSessions stream", e));

      unsubscribeAttendances = onSnapshot(collection(db, 'attendance'), (snapshot) => {
        setAttendances(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance))));
      }, (e) => console.warn("Notice: attendance stream", e));

      unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        const rawList = snapshot.docs.map(doc => ({ user_id: doc.id, ...doc.data() } as User));
        const deduplicated = Array.from(
          rawList.reduce((map, u) => {
            const normEmail = (u.email || '').trim().toLowerCase();
            const key = normEmail || u.user_id || (u as any).id;
            if (key && !map.has(key)) {
              map.set(key, u);
            } else if (key) {
              const existing = map.get(key)!;
              const rolePriority: Record<string, number> = { SUPER_ADMIN: 5, ADMIN: 4, DEPARTMENT_ADMIN: 3, TEACHER: 2, STUDENT: 1 };
              const preferred = (rolePriority[u.role] || 0) >= (rolePriority[existing.role] || 0) ? u : existing;
              map.set(key, { ...existing, ...preferred, department_id: preferred.department_id || existing.department_id });
            }
            return map;
          }, new Map<string, User>()).values()
        );
        setUsers(deduplicated);
      }, (e) => console.warn("Notice: users stream", e));

      unsubscribeStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
        setStudents(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student))));
      }, (e) => handleFirestoreError(e, OperationType.GET, 'students'));

      unsubscribeTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
        setTeachers(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher))));
      }, (e) => handleFirestoreError(e, OperationType.GET, 'teachers'));

      unsubscribeDeletedRecords = onSnapshot(collection(db, 'deletedRecords'), (snapshot) => {
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeletedRecord));
        setDeletedRecords(records);
      }, (e) => console.warn("Notice: deletedRecords stream", e));

      unsubscribeAuditLogs = onSnapshot(collection(db, 'auditLogs'), (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(logs);
      }, (e) => console.warn("Notice: auditLogs stream", e));

      unsubscribeSettings = onSnapshot(doc(db, 'system', 'settings'), (docSnap) => {
        if (docSnap.exists()) setSettings(prev => ({ ...prev, ...docSnap.data() as SystemSettings }));
      }, () => {});

      unsubscribeLogs = onSnapshot(query(collection(db, 'attendanceLogs'), limit(100)), (snapshot) => {
        const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
        logsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAttendanceLogs(logsData);
      }, (e) => handleFirestoreError(e, OperationType.GET, 'attendanceLogs'));

    } else if (user.role === 'DEPARTMENT_ADMIN') {
      const deptId = user.department_id;

      unsubscribeSettings = onSnapshot(doc(db, 'system', 'settings'), (docSnap) => {
        if (docSnap.exists()) setSettings(prev => ({ ...prev, ...docSnap.data() as SystemSettings }));
      }, () => {});

      unsubscribeAuditLogs = onSnapshot(collection(db, 'auditLogs'), (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(logs);
      }, (e) => console.warn("Notice: auditLogs stream", e));

      unsubscribeUnknownPersons = onSnapshot(collection(db, 'unknownPersons'), (snapshot) => {
        const persons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UnknownPerson));
        setUnknownPersons(persons);
      }, (e) => console.warn("Notice: unknownPersons stream", e));

      unsubscribeDeletedRecords = onSnapshot(collection(db, 'deletedRecords'), (snapshot) => {
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeletedRecord));
        setDeletedRecords(records);
      }, (e) => console.warn("Notice: deletedRecords stream", e));
      
      const coursesQ = (deptId && deptId.trim()) ? query(collection(db, 'courses'), where('department_id', '==', deptId)) : collection(db, 'courses');
      unsubscribeCourses = onSnapshot(coursesQ, (snapshot) => {
        setCourses(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course))));
      }, (e) => console.warn("Notice: courses stream", e));

      const offeringsQ = (deptId && deptId.trim()) ? query(collection(db, 'courseOfferings'), where('department_id', '==', deptId)) : collection(db, 'courseOfferings');
      unsubscribeCourseOfferings = onSnapshot(offeringsQ, (snapshot) => {
        setCourseOfferings(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseOffering))));
      }, (e) => console.warn("Notice: courseOfferings stream", e));

      const examsQ = (deptId && deptId.trim()) ? query(collection(db, 'exams'), where('department_id', '==', deptId)) : collection(db, 'exams');
      unsubscribeExams = onSnapshot(examsQ, (snapshot) => {
        setExams(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam))));
      }, (e) => console.warn("Notice: exams stream", e));

      unsubscribeResults = onSnapshot(collection(db, 'results'), (snapshot) => {
        setResults(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result))));
      }, (e) => console.warn("Notice: results stream", e));

      unsubscribeEnrollments = onSnapshot(collection(db, 'enrollments'), (snapshot) => {
        setEnrollments(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Enrollment))));
      }, (e) => console.warn("Notice: enrollments stream", e));

      unsubscribeTimetables = onSnapshot(collection(db, 'timetables'), (snapshot) => {
        setTimetables(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Timetable))));
      }, (e) => console.warn("Notice: timetables stream", e));

      unsubscribeClassSessions = onSnapshot(collection(db, 'classSessions'), (snapshot) => {
        const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSession));
        sessionsData.sort((a, b) => new Date(b.date + ' ' + b.start_time).getTime() - new Date(a.date + ' ' + a.start_time).getTime());
        setClassSessions(sessionsData);
        const active = sessionsData.find(s => s.status === 'ACTIVE');
        if (active) setActiveSession(active);
      }, (e) => console.warn("Notice: classSessions stream", e));

      unsubscribeAttendances = onSnapshot(collection(db, 'attendance'), (snapshot) => {
        setAttendances(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance))));
      }, (e) => console.warn("Notice: attendance stream", e));

      const usersQ = (deptId && deptId.trim()) ? query(collection(db, 'users'), where('department_id', '==', deptId)) : collection(db, 'users');
      unsubscribeUsers = onSnapshot(usersQ, (snapshot) => {
        const rawList = snapshot.docs.map(doc => ({ user_id: doc.id, ...doc.data() } as User));
        const deduplicated = Array.from(
          rawList.reduce((map, u) => {
            const normEmail = (u.email || '').trim().toLowerCase();
            const key = normEmail || u.user_id || (u as any).id;
            if (key && !map.has(key)) {
              map.set(key, u);
            } else if (key) {
              const existing = map.get(key)!;
              const rolePriority: Record<string, number> = { SUPER_ADMIN: 5, ADMIN: 4, DEPARTMENT_ADMIN: 3, TEACHER: 2, STUDENT: 1 };
              const preferred = (rolePriority[u.role] || 0) >= (rolePriority[existing.role] || 0) ? u : existing;
              map.set(key, { ...existing, ...preferred, department_id: preferred.department_id || existing.department_id });
            }
            return map;
          }, new Map<string, User>()).values()
        );
        setUsers(deduplicated);
      }, (e) => console.warn("Notice: users stream", e));

      const studentsQ = (deptId && deptId.trim()) ? query(collection(db, 'students'), where('department_id', '==', deptId)) : collection(db, 'students');
      unsubscribeStudents = onSnapshot(studentsQ, (snapshot) => {
        setStudents(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student))));
      }, (e) => handleFirestoreError(e, OperationType.GET, 'students'));

      const teachersQ = (deptId && deptId.trim()) ? query(collection(db, 'teachers'), where('department_id', '==', deptId)) : collection(db, 'teachers');
      unsubscribeTeachers = onSnapshot(teachersQ, (snapshot) => {
        setTeachers(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher))));
      }, (e) => handleFirestoreError(e, OperationType.GET, 'teachers'));

      unsubscribeLogs = onSnapshot(query(collection(db, 'attendanceLogs'), limit(100)), (snapshot) => {
        const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
        logsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAttendanceLogs(logsData);
      }, (e) => handleFirestoreError(e, OperationType.GET, 'attendanceLogs'));

    } else if (user.role === 'TEACHER') {
      const teacherId = user.user_id || user.id || (user as any).uid;
      const deptId = user.department_id;

      // Subscribe to all teachers in department or all teachers so faculty directory and colleagues are visible
      unsubscribeTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
        if (!snapshot.empty) {
          setTeachers(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher))));
        }
      }, (e) => console.warn("Notice: teachers stream", e));

      unsubscribeCourseOfferings = onSnapshot(collection(db, 'courseOfferings'), (snapshot) => {
        if (!snapshot.empty) {
          setCourseOfferings(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseOffering))));
        }
      }, (e) => console.warn("Notice: teacher courseOfferings stream", e));

      unsubscribeClassSessions = onSnapshot(collection(db, 'classSessions'), (snapshot) => {
        const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSession));
        sessionsData.sort((a, b) => new Date(b.date + ' ' + b.start_time).getTime() - new Date(a.date + ' ' + a.start_time).getTime());
        setClassSessions(sessionsData);
        const active = sessionsData.find(s => s.status === 'ACTIVE');
        if (active) setActiveSession(active);
      }, (e) => console.warn("Notice: teacher classSessions stream", e));

      const coursesQ = (deptId && deptId.trim()) ? query(collection(db, 'courses'), where('department_id', '==', deptId)) : collection(db, 'courses');
      unsubscribeCourses = onSnapshot(coursesQ, (snapshot) => {
        if (!snapshot.empty) {
          setCourses(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course))));
        }
      }, (e) => console.warn("Notice: courses stream", e));

      unsubscribeAttendances = onSnapshot(collection(db, 'attendance'), (snapshot) => {
        if (!snapshot.empty) {
          setAttendances(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance))));
        }
      }, (e) => console.warn("Notice: attendance stream", e));

      unsubscribeResults = onSnapshot(collection(db, 'results'), (snapshot) => {
        if (!snapshot.empty) {
          setResults(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result))));
        }
      }, (e) => console.warn("Notice: results stream", e));

      unsubscribeExams = onSnapshot(collection(db, 'exams'), (snapshot) => {
        if (!snapshot.empty) {
          setExams(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam))));
        }
      }, (e) => console.warn("Notice: exams stream", e));

      const studentsQ = (deptId && deptId.trim()) ? query(collection(db, 'students'), where('department_id', '==', deptId)) : collection(db, 'students');
      unsubscribeStudents = onSnapshot(studentsQ, (snapshot) => {
        if (!snapshot.empty) {
          setStudents(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student))));
        }
      }, (e) => handleFirestoreError(e, OperationType.GET, 'students'));

      unsubscribeEnrollments = onSnapshot(collection(db, 'enrollments'), (snapshot) => {
        if (!snapshot.empty) {
          setEnrollments(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Enrollment))));
        }
      }, (e) => console.warn("Notice: enrollments stream", e));

      unsubscribeTimetables = onSnapshot(collection(db, 'timetables'), (snapshot) => {
        if (!snapshot.empty) {
          setTimetables(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Timetable))));
        }
      }, (e) => console.warn("Notice: timetables stream", e));

    } else if (user.role === 'STUDENT') {
      const studentUid = user.user_id || user.id || (user as any).uid;

      // Student listens to teachers so they can see faculty coordinators and instructor profiles
      unsubscribeTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
        if (!snapshot.empty) {
          setTeachers(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher))));
        }
      }, (e) => console.warn("Notice: student teachers stream", e));

      // Student listens to courses
      unsubscribeCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
        if (!snapshot.empty) {
          setCourses(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course))));
        }
      }, (e) => console.warn("Notice: student courses stream", e));

      // Student listens to exams
      unsubscribeExams = onSnapshot(collection(db, 'exams'), (snapshot) => {
        if (!snapshot.empty) {
          setExams(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam))));
        }
      }, (e) => console.warn("Notice: student exams stream", e));

      // Student listens to class sessions
      unsubscribeClassSessions = onSnapshot(collection(db, 'classSessions'), (snapshot) => {
        const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSession));
        sessionsData.sort((a, b) => new Date(b.date + ' ' + b.start_time).getTime() - new Date(a.date + ' ' + a.start_time).getTime());
        setClassSessions(sessionsData);
        const active = sessionsData.find(s => s.status === 'ACTIVE');
        if (active) setActiveSession(active);
      }, (e) => console.warn("Notice: student classSessions stream", e));

      if (studentUid && typeof studentUid === 'string' && studentUid.trim() !== '') {
        // Student streams attendance records
        const attQ = query(collection(db, 'attendance'), where('student_id', '==', studentUid));
        unsubscribeAttendances = onSnapshot(attQ, (snapshot) => {
          if (!snapshot.empty) {
            setAttendances(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance))));
          }
        }, (e) => console.warn("Notice: student attendance stream", e));

        // Student streams results
        const resQ = query(collection(db, 'results'), where('student_id', '==', studentUid));
        unsubscribeResults = onSnapshot(resQ, (snapshot) => {
          if (!snapshot.empty) {
            setResults(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result))));
          }
        }, (e) => console.warn("Notice: student results stream", e));

        // Student streams enrollments
        const enrollQ = query(collection(db, 'enrollments'), where('student_id', '==', studentUid));
        unsubscribeEnrollments = onSnapshot(enrollQ, (snapshot) => {
          if (!snapshot.empty) {
            setEnrollments(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Enrollment))));
          }
        }, (e) => console.warn("Notice: student enrollments stream", e));

        // Student reads their own profile
        unsubscribeStudents = onSnapshot(doc(db, 'students', studentUid), async (docSnap) => {
          if (docSnap.exists()) {
            setStudents(prev => [
              { id: docSnap.id, ...docSnap.data() } as Student,
              ...prev.filter(s => s.id !== docSnap.id)
            ]);
          } else {
            const studentData = {
              id: studentUid,
              user_id: studentUid,
              name: user.name || user.email?.split('@')[0] || 'Abhi Kumar Sharma',
              firstName: user.name || user.email?.split('@')[0] || 'Abhi',
              department_id: user.department_id || 'dept-cse',
              department: 'Computer Science & Engineering',
              program_id: 'prog-btech-cse',
              batch_id: 'batch-2023-2027',
              current_semester_id: 'sem-4',
              current_section_id: 'sec-a',
              current_academic_year_id: 'ay-2024-2025',
              images: 15,
              email: user.email || 'student@smartattend.ai',
              registrationNumber: 'REG2023001',
              usn: '1RV23CS001',
              modeOfAdmission: 'Government',
              dateOfAdmission: '2023-08-15',
              status: 'ACTIVE' as Status
            };
            try {
              await setDoc(doc(db, 'students', studentUid), studentData);
            } catch (e) {
              console.warn("Failed to auto-create student profile", e);
            }
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `students/${studentUid}`);
        });

        // Student attendance logs
        const q = query(
          collection(db, 'attendanceLogs'), 
          where('studentId', '==', studentUid),
          limit(100)
        );
        unsubscribeLogs = onSnapshot(q, (snapshot) => {
          const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
          logsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setAttendanceLogs(logsData);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `attendanceLogs (studentId: ${studentUid})`);
        });
      }

      // Timetables and Course Offerings relevant to student
      unsubscribeTimetables = onSnapshot(collection(db, 'timetables'), (snapshot) => {
        if (!snapshot.empty) {
          setTimetables(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Timetable))));
        }
      }, (e) => console.warn("Notice: timetables stream", e));

      unsubscribeCourseOfferings = onSnapshot(collection(db, 'courseOfferings'), (snapshot) => {
        if (!snapshot.empty) {
          setCourseOfferings(uniqueDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseOffering))));
        }
      }, (e) => console.warn("Notice: courseOfferings stream", e));
    }

    }, 250); // Delay subscriptions slightly to avoid React Strict Mode HMR race conditions

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      try { if (unsubscribeStudents) unsubscribeStudents();
      if (unsubscribeTeachers) unsubscribeTeachers(); } catch (e) {}
      try { if (unsubscribeUsers) unsubscribeUsers(); } catch (e) {}
      try { if (unsubscribeCourses) unsubscribeCourses(); } catch (e) {}
      try { if (unsubscribeCourseOfferings) unsubscribeCourseOfferings(); } catch (e) {}
      try { if (unsubscribeEnrollments) unsubscribeEnrollments(); } catch (e) {}
      try { if (unsubscribeTimetables) unsubscribeTimetables(); } catch (e) {}
      try { if (unsubscribeClassSessions) unsubscribeClassSessions(); } catch (e) {}
      try { if (unsubscribeAttendances) unsubscribeAttendances(); } catch (e) {}
      try { if (unsubscribeExams) unsubscribeExams(); } catch (e) {}
      try { if (unsubscribeResults) unsubscribeResults(); } catch (e) {}
      try { if (unsubscribeLogs) unsubscribeLogs(); } catch (e) {}
      try { if (unsubscribeSettings) unsubscribeSettings(); } catch (e) {}
      try { if (unsubscribeDeletedRecords) unsubscribeDeletedRecords(); } catch (e) {}
      try { if (unsubscribeAuditLogs) unsubscribeAuditLogs(); } catch (e) {}
      try { if (unsubscribeNotifications) unsubscribeNotifications(); } catch (e) {}
      try { if (unsubscribeUnknownPersons) unsubscribeUnknownPersons(); } catch (e) {}
    };
  }, [user?.user_id, user?.role, user?.department_id, isAuthenticated, isAuthReady]);

  
  const addTeacher = async (teacher: Teacher) => {
    const normEmail = (teacher.email || '').trim().toLowerCase();
    if (normEmail) {
      const emailExists = teachers.some(t => (t.email || '').trim().toLowerCase() === normEmail && t.id !== teacher.id) ||
                          students.some(s => (s.email || '').trim().toLowerCase() === normEmail) ||
                          users.some(u => (u.email || '').trim().toLowerCase() === normEmail);
      if (emailExists) {
        throw new Error('A user with this email address already exists.');
      }
    }
    const teacherId = teacher.teacher_id || teacher.id || `FAC${Date.now().toString().slice(-6)}`;
    const userId = teacher.user_id || teacher.id || teacherId;
    const now = new Date().toISOString();

    const canonicalTeacher: Teacher = {
      id: teacherId,
      teacher_id: teacherId,
      user_id: userId,
      employee_id: teacher.employee_id || `EMP-${teacherId}`,
      name: teacher.name,
      email: teacher.email,
      department_id: teacher.department_id,
      designation: teacher.designation || 'Assistant Professor',
      status: teacher.status || 'ACTIVE',
      created_at: teacher.created_at || now,
      updated_at: now
    };

    setTeachers(prev => [canonicalTeacher, ...prev.filter(t => t.id !== teacherId && t.teacher_id !== teacherId)]);

    const userToSave: User = {
      user_id: userId,
      name: canonicalTeacher.name,
      email: canonicalTeacher.email,
      role: 'TEACHER',
      department_id: canonicalTeacher.department_id,
      status: canonicalTeacher.status,
      created_at: canonicalTeacher.created_at,
      updated_at: now
    };

    setUsers(prev => [userToSave, ...prev.filter(u => u.user_id !== userId)]);

    try {
    if (!teacherId) throw new Error("Firestore ID is undefined for collection teachers at line 702");
      await setDoc(doc(db, 'teachers', teacherId), cleanObject(canonicalTeacher));
    if (!userId) throw new Error("Firestore ID is undefined for collection users at line 704");
      await setDoc(doc(db, 'users', userId), cleanObject(userToSave));
      addAuditLog('ADD_TEACHER', `Created teacher: ${canonicalTeacher.name} (${teacherId})`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `teachers/${teacherId}`);
    }
  };

    const updateTeacher = async (id: string, data: Partial<Teacher>) => {
    if (data.email) {
      const normEmail = data.email.trim().toLowerCase();
      const emailExists = teachers.some(t => (t.email || '').trim().toLowerCase() === normEmail && t.id !== id) ||
                          students.some(s => (s.email || '').trim().toLowerCase() === normEmail) ||
                          users.some(u => (u.email || '').trim().toLowerCase() === normEmail);
      if (emailExists) {
        throw new Error('A user with this email address already exists.');
      }
    }
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    try {
      const cleanData = cleanObject(data as Record<string, any>);
    if (!id) throw new Error("Firestore ID is undefined for collection teachers at line 719");
      await updateDoc(doc(db, 'teachers', id), cleanData);
      
      // Sync basic fields to User doc
      const teacher = teachers.find(t => t.id === id);
      if (teacher) {
         const userUpdates: any = {};
         if (data.name) userUpdates.name = data.name;
         if (data.email) userUpdates.email = data.email;
         if (data.department_id) userUpdates.department_id = data.department_id;
         if (data.status) userUpdates.status = data.status;
         
         if (Object.keys(userUpdates).length > 0) {
            setUsers(prev => prev.map(u => u.user_id === teacher.user_id ? { ...u, ...userUpdates } : u));
            await updateDoc(doc(db, 'users', teacher.user_id), userUpdates);
         }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `teachers/${id}`);
    }
  };

  const deleteTeacher = async (id: string) => {
    setTeachers(prev => prev.filter(t => t.id !== id));
    try {
      const teacher = teachers.find(t => t.id === id);
      try {
        if (teacher) {
          const deletedRecord = {
            id: `del_${Date.now()}`,
            type: 'teacher' as const,
            originalId: id,
            deletedAt: new Date().toISOString(),
            teacherData: JSON.parse(JSON.stringify(teacher))
          };
          await setDoc(doc(db, 'deletedRecords', deletedRecord.id), deletedRecord);
        }
      } catch (archiveErr) {
        console.warn('Notice: Failed to archive deleted teacher record', archiveErr);
      }
    if (!id) throw new Error("Firestore ID is undefined for collection teachers at line 759");
      await deleteDoc(doc(db, 'teachers', id));
      addAuditLog('DELETE_TEACHER', `Deleted teacher with ID: ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `teachers/${id}`);
    }
  };

  const addStudent = async (student: Omit<Student, 'images'>) => {
    if (student.email) {
      const emailExists = students.some(s => s.email === student.email && s.id !== student.id) || users.some(u => u.email === student.email && u.user_id !== student.id);
      if (emailExists) {
        throw new Error('A user with this email ID already exists.');
      }
    }
    const newStudent: Student = normalizeStudent({
      ...student,
      images: (student as any).images || 0
    });
    setStudents(prev => [newStudent, ...prev.filter(s => s.id !== newStudent.id)]);
    try {
      await setDoc(doc(db, 'students', student.id), cleanObject(newStudent));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `students/${student.id}`);
    }
  };

  const updateStudent = async (id: string, data: Partial<Student>) => {
    if (data.email) {
      const emailExists = students.some(s => s.email === data.email && s.id !== id) || users.some(u => u.email === data.email && u.user_id !== id);
      if (emailExists) {
        throw new Error('A user with this email ID already exists.');
      }
    }
    const targetId = data.id || id;
    setStudents(prev => prev.map(s => s.id === id || s.id === targetId ? { ...s, ...data, id: targetId } : s));
    try {
      if (targetId !== id) {
        await deleteDoc(doc(db, 'students', id));
        const updatedStudent = cleanObject({ ...(students.find(s => s.id === id) || {}), ...data, id: targetId, user_id: targetId });
        await setDoc(doc(db, 'students', targetId), updatedStudent);
      } else {
        const cleanData = cleanObject(data as Record<string, any>);
      if (!id) throw new Error("Firestore ID is undefined for collection students at line 803");
        await updateDoc(doc(db, 'students', id), cleanData);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${id}`);
    }
  };

  const deleteStudent = async (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    try {
      const studentData = students.find(s => s.id === id);
      const userData = users.find(u => u.user_id === id);
      const logsToDelete = attendanceLogs.filter(log => log.studentId === id);

      try {
        if (studentData || userData) {
          const deletedRecord: any = {
            id: `del_${new Date().getTime()}_${id}`,
            originalId: id,
            type: 'student',
            attendanceLogs: logsToDelete,
            deletedAt: new Date().toISOString()
          };
          if (studentData) deletedRecord.studentData = JSON.parse(JSON.stringify(studentData));
          if (userData) deletedRecord.userData = JSON.parse(JSON.stringify(userData));
          await setDoc(doc(db, 'deletedRecords', deletedRecord.id), deletedRecord as DeletedRecord);
        }
      } catch (archiveErr) {
        console.warn('Notice: Failed to archive deleted student record', archiveErr);
      }

    if (!id) throw new Error("Firestore ID is undefined for collection students at line 834");
      await deleteDoc(doc(db, 'students', id));
      
      // Also delete from users collection if exists
      try {
    if (!id) throw new Error("Firestore ID is undefined for collection users at line 839");
        await deleteDoc(doc(db, 'users', id));
      } catch (e) {
        // Ignore if user document doesn't exist
      }
      
      // Cascading delete for attendance logs to prevent ghost logs for deleted users
      for (const log of logsToDelete) {
        try {
          await deleteDoc(doc(db, 'attendanceLogs', log.id));
        } catch (e) {
          // ignore
        }
      }
      addAuditLog('DELETE_STUDENT', `Deleted student with ID: ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
    }
  };

  const updateStudentImages = async (id: string, count: number) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, images: Math.max(0, (s.images || 0) + count) } : s));
    const student = students.find(s => s.id === id);
    if (student) {
      try {
    if (!id) throw new Error("Firestore ID is undefined for collection students at line 864");
        await updateDoc(doc(db, 'students', id), { 
          images: increment(count)
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `students/${id}`);
      }
    }
  };

  const addDatasetImage = async (studentId: string, url: string) => {
    const student = students.find(s => s.id === studentId);
    
    // 1. Verify and enroll with AI Backend FIRST
    if (url.startsWith('data:image/')) {
      try {
        const dept = student?.department || 'Unknown_Department';
        const year = student?.year || 'Unknown_Year';
        const sem = student?.semester || 'Unknown_Semester';
        const role = student?.role || 'Student';

        const response = await fetch('http://localhost:5000/enroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: url, 
            student_id: studentId,
            department: dept,
            year: year,
            semester: sem,
            role: role
          })
        });
        
        const result = await response.json();
        
        if (!response.ok || (result && result.success === false)) {
           throw new Error(result.message || 'Image rejected by AI quality check.');
        }
        
        console.log('[Adaptive AI] Enrolled face snapshot:', result);
      } catch (backendError: any) {
        if (backendError.message === 'Failed to fetch') {
          console.warn('[Adaptive AI] Python backend offline. Enrolling to database only.');
        } else {
          // Re-throw AI quality check errors to abort enrollment
          throw backendError;
        }
      }
    }

    // 2. Only proceed to save in Firestore if AI passed
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, images: (s.images || 0) + 1 } : s));
    try {
      const datasetRef = collection(db, 'students', studentId, 'dataset');
      const newDocRef = doc(datasetRef);
      await setDoc(newDocRef, {
        url,
        createdAt: new Date().toISOString()
      });
      
      // Update the student's image count in Firestore
      if (student) {
    if (!studentId) throw new Error("Firestore ID is undefined for collection students at line 927");
        await updateDoc(doc(db, 'students', studentId), { 
          images: increment(1)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `students/${studentId}/dataset`);
      throw error;
    }
  };

  const deleteDatasetImage = async (studentId: string, imageId: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, images: Math.max(0, (s.images || 0) - 1) } : s));
    try {
      await deleteDoc(doc(db, 'students', studentId, 'dataset', imageId));
      
      // Also update the student's image count
      const student = students.find(s => s.id === studentId);
      if (student && student.images > 0) {
    if (!studentId) throw new Error("Firestore ID is undefined for collection students at line 946");
        await updateDoc(doc(db, 'students', studentId), { 
          images: increment(-1)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${studentId}/dataset/${imageId}`);
      throw error;
    }
  };

  const updateUnknownPersonStatus = (id: string, status: UnknownPerson['status']) => {
    setUnknownPersons(unknownPersons.map(p => (p.id === id ? { ...p, status } : p)));
  };

  const addUnknownPerson = (person: Omit<UnknownPerson, 'id'>) => {
    const newUnknown: UnknownPerson = {
      ...person,
      id: `U${Date.now()}`
    };
    setUnknownPersons(prev => [newUnknown, ...prev]);
  };

  const seedSampleData = async () => {
    try {
      // 1. Seed Teachers
      for (const t of canonicalTeachers) {
        await setDoc(doc(db, 'teachers', t.id), t);
      }

      // 2. Seed Courses
      for (const c of canonicalCourses) {
        await setDoc(doc(db, 'courses', c.id), c);
      }

      // 3. Seed Course Offerings
      for (const co of canonicalCourseOfferings) {
        await setDoc(doc(db, 'courseOfferings', co.id), co);
      }

      // 4. Seed Students
      for (const s of canonicalStudents) {
        await setDoc(doc(db, 'students', s.id), s);
      }

      // 5. Seed Enrollments
      for (const enr of canonicalEnrollments) {
        await setDoc(doc(db, 'enrollments', enr.id), enr);
      }

      // 6. Seed Timetables
      for (const tt of canonicalTimetables) {
        await setDoc(doc(db, 'timetables', tt.id), tt);
      }

      // 7. Seed Exams
      for (const ex of canonicalExams) {
        await setDoc(doc(db, 'exams', ex.id), ex);
      }

      // 8. Seed Results
      for (const res of canonicalResults) {
        await setDoc(doc(db, 'results', res.id), res);
      }

      // 9. Seed Attendances
      for (const att of canonicalAttendances) {
        await setDoc(doc(db, 'attendance', att.id), att);
      }

      // 10. Seed daily Attendance Logs
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const subjects = ['Operating Systems & Kernel Architecture', 'Database Management Systems', 'Artificial Intelligence & Neural Networks', 'Computer Networks & Security'];

      for (const s of canonicalStudents) {
        const logId1 = `A_SEED_${s.id}_TODAY`;
        await setDoc(doc(db, 'attendanceLogs', logId1), {
          id: logId1,
          studentId: s.id,
          studentName: s.name,
          department: s.department,
          subject: subjects[0],
          loginTime: '09:05 AM',
          logoutTime: '10:00 AM',
          date: today,
          duration: '55m',
          status: 'Present'
        });

        const logId2 = `A_SEED_${s.id}_YESTERDAY`;
        await setDoc(doc(db, 'attendanceLogs', logId2), {
          id: logId2,
          studentId: s.id,
          studentName: s.name,
          department: s.department,
          subject: subjects[1],
          loginTime: '10:02 AM',
          logoutTime: '11:00 AM',
          date: yesterday,
          duration: '58m',
          status: 'Present'
        });
      }

      setTeachers(canonicalTeachers);
      setCourses(canonicalCourses);
      setCourseOfferings(canonicalCourseOfferings);
      setStudents(canonicalStudents);
      setEnrollments(canonicalEnrollments);
      setTimetables(canonicalTimetables);
      setExams(canonicalExams);
      setResults(canonicalResults);
      setAttendances(canonicalAttendances);

      console.log("Interlinked sample data seeded successfully across all portals.");
      await addAuditLog('SEED_DATA', 'Successfully seeded interconnected academic dataset across all portals.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'seeding');
    }
  };

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    try {
      await setDoc(doc(db, 'system', 'settings'), updatedSettings, { merge: true });
      addAuditLog('UPDATE_SETTINGS', `Updated system settings`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'system/settings');
    }
  };

  const addAttendanceLog = async (log: Omit<AttendanceRecord, 'id'>) => {
    const newId = `A${Date.now()}`;
    const newLog = { ...log, id: newId };
    setAttendanceLogs(prev => [newLog as AttendanceRecord, ...prev]);
    try {
    if (!newId) throw new Error("Firestore ID is undefined for collection attendanceLogs at line 1074");
      await setDoc(doc(db, 'attendanceLogs', newId), newLog);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendanceLogs/${newId}`);
    }
  };

  const addUser = async (newUser: Omit<User, 'id'> & { id?: string }) => {
    const normEmail = (newUser.email || '').trim().toLowerCase();
    if (normEmail) {
      const existingUser = users.find(u => (u.email || '').trim().toLowerCase() === normEmail);
      if (existingUser) {
        const targetId = existingUser.user_id || (existingUser as any).id;
        if (targetId) {
          await updateUser(targetId, newUser);
          return;
        }
      }
    }
    const docId = newUser.id || `U${Date.now().toString().slice(-5)}${Date.now().toString().slice(-4) + Math.floor(100 + Math.random() * 900)}`;
    const userToSave: User = { ...newUser, user_id: docId, created_at: new Date().toISOString() } as User;
    setUsers(prev => {
      const updated = [userToSave, ...prev.filter(u => u.user_id !== docId && (normEmail ? (u.email || '').trim().toLowerCase() !== normEmail : true))];
      return updated;
    });
    try {
      if (!docId) throw new Error("Firestore ID is undefined for collection users");
      await setDoc(doc(db, 'users', docId), cleanObject(userToSave));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users`);
    }
  };

  const updateUser = async (id: string, data: Partial<User>) => {
    setUsers(prev => prev.map(u => u.user_id === id ? { ...u, ...data } : u));
    try {
      const cleanData = cleanObject(data as Record<string, any>);
      if (!id) throw new Error("Firestore ID is undefined for collection users");
      await updateDoc(doc(db, 'users', id), cleanData);
      if (data.role) {
        addAuditLog('UPDATE_USER_ROLE', `Updated role for user ${id} to ${data.role}`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
    }
  };

  const deleteUser = async (id: string) => {
    setUsers(prev => prev.filter(u => u.user_id !== id));
    try {
      const userToDelete = users.find(u => u.user_id === id);
      const studentData = students.find(s => s.id === id);
      const logsToDelete = attendanceLogs.filter(log => log.studentId === id);

      try {
        if (userToDelete || studentData) {
          const deletedRecord: any = {
            id: `del_${new Date().getTime()}_${id}`,
            originalId: id,
            type: (userToDelete?.role as string) === 'STUDENT' ? 'student' : 'user',
            attendanceLogs: logsToDelete,
            deletedAt: new Date().toISOString()
          };
          if (userToDelete) deletedRecord.userData = JSON.parse(JSON.stringify(userToDelete));
          if (studentData) deletedRecord.studentData = JSON.parse(JSON.stringify(studentData));
          await setDoc(doc(db, 'deletedRecords', deletedRecord.id), cleanObject(deletedRecord as DeletedRecord));
        }
      } catch (archiveErr) {
        console.warn('Notice: Failed to archive deleted user record', archiveErr);
      }

    if (!id) throw new Error("Firestore ID is undefined for collection users at line 1148");
      await deleteDoc(doc(db, 'users', id));
      
      if ((userToDelete?.role as string) === 'STUDENT') {
        try {
    if (!id) throw new Error("Firestore ID is undefined for collection students at line 1153");
          await deleteDoc(doc(db, 'students', id));
          // Cascading delete for attendance logs
          for (const log of logsToDelete) {
            try {
              await deleteDoc(doc(db, 'attendanceLogs', log.id));
            } catch (e) {
              // Ignore
            }
          }
        } catch (e) {
          // Ignore
        }
      }
      addAuditLog('DELETE_USER', `Deleted user with ID: ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  const restoreRecord = async (id: string) => {
    try {
      const record = deletedRecords.find(r => r.id === id);
      if (!record) return;

      if (record.userData) {
        await setDoc(doc(db, 'users', record.originalId), record.userData);
      }
      if (record.studentData) {
        await setDoc(doc(db, 'students', record.originalId), record.studentData);
      }
      if (record.attendanceLogs && record.attendanceLogs.length > 0) {
        for (const log of record.attendanceLogs) {
          await setDoc(doc(db, 'attendanceLogs', log.id), log);
        }
      }

    if (!id) throw new Error("Firestore ID is undefined for collection deletedRecords at line 1190");
      await deleteDoc(doc(db, 'deletedRecords', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `deletedRecords/restore/${id}`);
    }
  };

  const deleteRecordPermanently = async (id: string) => {
    try {
    if (!id) throw new Error("Firestore ID is undefined for collection deletedRecords at line 1199");
      await deleteDoc(doc(db, 'deletedRecords', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `deletedRecords/${id}`);
    }
  };

  const addCourse = async (newCourse: Partial<Course>) => {
    const docId = newCourse.course_id || newCourse.id || `CRS-${(newCourse.course_code || Date.now().toString()).replace(/[^a-zA-Z0-9]/g, '')}`;
    const now = new Date().toISOString();
    const courseToSave: Course = {
      id: docId,
      course_id: docId,
      course_code: newCourse.course_code || 'CODE101',
      course_name: newCourse.course_name || 'Unnamed Course',
      department_id: newCourse.department_id || '',
      program_id: newCourse.program_id || '',
      credits: newCourse.credits || 3,
      course_type: newCourse.course_type || 'Core',
      description: newCourse.description || '',
      status: newCourse.status || 'ACTIVE',
      created_at: now,
      updated_at: now
    };
    setCourses(prev => [...prev.filter(c => c.id !== docId && c.course_id !== docId), courseToSave]);
    try {
    if (!docId) throw new Error("Firestore ID is undefined for collection courses at line 1225");
      await setDoc(doc(db, 'courses', docId), cleanObject(courseToSave));
      addAuditLog('ADD_COURSE', `Created canonical Course ${courseToSave.course_code} (${courseToSave.course_id})`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `courses`);
    }
  };

  const updateCourse = async (id: string, data: Partial<Course>) => {
    const now = new Date().toISOString();
    const updates = { ...data, updated_at: now };
    setCourses(prev => prev.map(c => (c.id === id || c.course_id === id) ? { ...c, ...updates } : c));
    try {
      const cleanData = cleanObject(updates as Record<string, any>);
    if (!id) throw new Error("Firestore ID is undefined for collection courses at line 1244");
      await updateDoc(doc(db, 'courses', id), cleanData);
      addAuditLog('UPDATE_COURSE', `Updated Course ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `courses/${id}`);
    }
  };

  const deleteCourse = async (id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id && c.course_id !== id));
    try {
    if (!id) throw new Error("Firestore ID is undefined for collection courses at line 1255");
      await deleteDoc(doc(db, 'courses', id));
      addAuditLog('DELETE_COURSE', `Deleted Course ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `courses/${id}`);
    }
  };

  const addCourseOffering = async (newOffering: Partial<CourseOffering>) => {
    const docId = newOffering.course_offering_id || newOffering.id || `OFF${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const offeringToSave: CourseOffering = {
      id: docId,
      course_offering_id: docId,
      course_id: newOffering.course_id || '',
      teacher_id: newOffering.teacher_id || '',
      department_id: newOffering.department_id || '',
      program_id: newOffering.program_id || '',
      batch_id: newOffering.batch_id || '',
      academic_year_id: newOffering.academic_year_id || '',
      semester_id: newOffering.semester_id || '',
      section_id: newOffering.section_id || '',
      start_date: newOffering.start_date || '',
      end_date: newOffering.end_date || '',
      status: newOffering.status || 'ACTIVE',
      created_at: now,
      updated_at: now
    };
    
    setCourseOfferings(prev => [...prev.filter(co => co.id !== docId && co.course_offering_id !== docId), offeringToSave]);
    try {
    if (!docId) throw new Error("Firestore ID is undefined for collection courseOfferings at line 1286");
      await setDoc(doc(db, 'courseOfferings', docId), cleanObject(offeringToSave));
      addAuditLog('ADD_COURSE_OFFERING', `Created CourseOffering ${docId} for Course ${offeringToSave.course_id} and Teacher ${offeringToSave.teacher_id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `courseOfferings`);
    }
  };

  const updateCourseOffering = async (id: string, data: Partial<CourseOffering>) => {
    const now = new Date().toISOString();
    const updates = { ...data, updated_at: now };
    setCourseOfferings(prev => prev.map(co => (co.id === id || co.course_offering_id === id) ? { ...co, ...updates } : co));
    try {
      const cleanData = cleanObject(updates as Record<string, any>);
    if (!id) throw new Error("Firestore ID is undefined for collection courseOfferings at line 1303");
      await updateDoc(doc(db, 'courseOfferings', id), cleanData);
      addAuditLog('UPDATE_COURSE_OFFERING', `Updated CourseOffering ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `courseOfferings/${id}`);
    }
  };

  const deleteCourseOffering = async (id: string) => {
    setCourseOfferings(prev => prev.filter(co => co.id !== id && co.course_offering_id !== id));
    try {
    if (!id) throw new Error("Firestore ID is undefined for collection courseOfferings at line 1314");
      await deleteDoc(doc(db, 'courseOfferings', id));
      addAuditLog('DELETE_COURSE_OFFERING', `Deleted CourseOffering ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `courseOfferings/${id}`);
    }
  };
  

  
  const addEnrollment = async (newEnrollment: Partial<Enrollment>) => {
    // 1. Validate student exists
    const student = students.find(s => s.id === newEnrollment.student_id || s.student_id === newEnrollment.student_id);
    if (!student) {
      throw new Error("Validation Error: Student record not found.");
    }

    // 2. Validate course offering exists
    const offering = courseOfferings.find(co => co.id === newEnrollment.course_offering_id || co.course_offering_id === newEnrollment.course_offering_id);
    if (!offering) {
      throw new Error("Validation Error: Course offering record not found.");
    }

    // 3. Validate student department matches course offering department
    if (student.department_id && offering.department_id && student.department_id !== offering.department_id) {
      throw new Error(`Validation Error: Student department (${student.department_id}) does not match CourseOffering department (${offering.department_id}).`);
    }

    // 4. Validate student program matches course offering program
    if (student.program_id && offering.program_id && student.program_id !== offering.program_id) {
      throw new Error(`Validation Error: Student program (${student.program_id}) does not match CourseOffering program (${offering.program_id}).`);
    }

    // 5. Validate student batch matches course offering batch
    if (student.batch_id && offering.batch_id && student.batch_id !== offering.batch_id) {
      throw new Error(`Validation Error: Student batch (${student.batch_id}) does not match CourseOffering batch (${offering.batch_id}).`);
    }

    // 6. Validate student semester matches course offering semester
    if (student.current_semester_id && offering.semester_id && student.current_semester_id !== offering.semester_id) {
      throw new Error(`Validation Error: Student semester (${student.current_semester_id}) does not match CourseOffering semester (${offering.semester_id}).`);
    }

    // 7. Validate student section matches course offering section (where present)
    if (student.current_section_id && offering.section_id && student.current_section_id !== offering.section_id) {
      throw new Error(`Validation Error: Student section (${student.current_section_id}) does not match CourseOffering section (${offering.section_id}).`);
    }

    // 8. Prevent duplicate enrollment
    const isDuplicate = enrollments.some(e => 
      (e.student_id === student.id || e.student_id === student.student_id) && 
      (e.course_offering_id === offering.id || e.course_offering_id === offering.course_offering_id)
    );
    if (isDuplicate) {
      throw new Error(`Validation Error: Student ${student.student_id || student.id} is already enrolled in CourseOffering ${offering.course_offering_id || offering.id}.`);
    }

    const docId = newEnrollment.enrollment_id || newEnrollment.id || `ENR${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    
    const canonicalEnrollment: Enrollment = {
      id: docId,
      enrollment_id: docId,
      student_id: student.student_id || student.id,
      course_offering_id: offering.course_offering_id || offering.id,
      academic_year_id: offering.academic_year_id || student.current_academic_year_id || '',
      semester_id: offering.semester_id || student.current_semester_id || '',
      section_id: offering.section_id || student.current_section_id || '',
      enrollment_date: newEnrollment.enrollment_date || now,
      status: newEnrollment.status || 'ACTIVE'
    };

    setEnrollments(prev => [...prev.filter(e => e.id !== docId && e.enrollment_id !== docId), canonicalEnrollment]);

    try {
    if (!docId) throw new Error("Firestore ID is undefined for collection enrollments at line 1389");
      await setDoc(doc(db, 'enrollments', docId), cleanObject(canonicalEnrollment));
      addAuditLog('ADD_ENROLLMENT', `Enrolled student ${canonicalEnrollment.student_id} into CourseOffering ${canonicalEnrollment.course_offering_id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `enrollments/${docId}`);
    }
  };

  const deleteEnrollment = async (id: string) => {
    setEnrollments(prev => prev.filter(e => e.id !== id && e.enrollment_id !== id));
    try {
    if (!id) throw new Error("Firestore ID is undefined for collection enrollments at line 1400");
      await deleteDoc(doc(db, 'enrollments', id));
      addAuditLog('DELETE_ENROLLMENT', `Deleted enrollment ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `enrollments/${id}`);
    }
  };

  const addTimetable = async (slot: Omit<Timetable, 'id'> & { id?: string; timetable_id?: string }) => {
    const docId = slot.timetable_id || slot.id || `TT${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const newSlot: Timetable = {
      ...slot,
      id: docId,
      timetable_id: docId,
      status: slot.status || 'ACTIVE',
      created_at: now,
      updated_at: now
    };
    setTimetables(prev => [...prev.filter(t => t.id !== docId && t.timetable_id !== docId), newSlot]);
    try {
    if (!docId) throw new Error("Firestore ID is undefined for collection timetables at line 1421");
      await setDoc(doc(db, 'timetables', docId), cleanObject(newSlot));
      addAuditLog('ADD_TIMETABLE', `Added timetable slot ${docId} for offering ${slot.course_offering_id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'timetables');
    }
  };

  const updateTimetable = async (id: string, data: Partial<Timetable>) => {
    setTimetables(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    try {
      const cleanData = cleanObject(data as Record<string, any>);
    if (!id) throw new Error("Firestore ID is undefined for collection timetables at line 1436");
      await updateDoc(doc(db, 'timetables', id), cleanData);
      addAuditLog('UPDATE_TIMETABLE', `Updated timetable slot ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `timetables/${id}`);
    }
  };

  const deleteTimetable = async (id: string) => {
    setTimetables(prev => prev.filter(t => t.id !== id));
    try {
    if (!id) throw new Error("Firestore ID is undefined for collection timetables at line 1447");
      await deleteDoc(doc(db, 'timetables', id));
      addAuditLog('DELETE_TIMETABLE', `Deleted timetable slot ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `timetables/${id}`);
    }
  };

  const startClassSession = async (
    timetableSlotOrOfferingId: string | Timetable,
    teacherIdOrRoom?: string,
    extraParam?: string
  ): Promise<ClassSession> => {
    let offeringId: string;
    let room = 'Room 101';
    let teacherId = user?.user_id || 'T001';

    if (typeof timetableSlotOrOfferingId === 'object' && timetableSlotOrOfferingId !== null) {
      offeringId = timetableSlotOrOfferingId.course_offering_id;
      room = timetableSlotOrOfferingId.room || room;
      if (teacherIdOrRoom) teacherId = teacherIdOrRoom;
    } else {
      const slotOrId = String(timetableSlotOrOfferingId);
      // Check if string is a timetable ID
      const slot = timetables.find(t => t.id === slotOrId);
      if (slot) {
        offeringId = slot.course_offering_id;
        room = slot.room || room;
        if (teacherIdOrRoom) teacherId = teacherIdOrRoom;
      } else {
        offeringId = slotOrId;
        if (teacherIdOrRoom && (teacherIdOrRoom.startsWith('Room') || teacherIdOrRoom.startsWith('Lab') || teacherIdOrRoom.includes(' '))) {
          room = teacherIdOrRoom;
        } else if (teacherIdOrRoom) {
          teacherId = teacherIdOrRoom;
        }
      }
    }

    const offering = courseOfferings.find(co => co.id === offeringId);
    if (!offering) {
      throw new Error('Course offering not found.');
    }

    if (offering.teacher_id) {
      teacherId = offering.teacher_id;
    }

    // Security check: teacher must match the offering's teacher or have admin role
    const currentTeacher = teachers.find(t => t.id === teacherId || t.teacher_id === teacherId || t.user_id === user?.user_id);
    const isAuthorized = 
      offering.teacher_id === teacherId ||
      (currentTeacher && (offering.teacher_id === currentTeacher.id || offering.teacher_id === currentTeacher.teacher_id)) ||
      offering.teacher_id === user?.user_id ||
      user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'DEPARTMENT_ADMIN' ||
      offering.teacher_id === 'T001';

    if (!isAuthorized) {
      throw new Error('You are not authorized to start a class session for another teacher’s course offering.');
    }

    const sessionId = `SES${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    const newSession: ClassSession = {
      id: sessionId,
      session_id: sessionId,
      course_offering_id: offeringId,
      teacher_id: offering.teacher_id || teacherId,
      date: dateStr,
      start_time: timeStr,
      room: room,
      status: 'ACTIVE',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    setActiveSession(newSession);
    setClassSessions(prev => [newSession, ...prev.filter(s => s.id !== sessionId)]);

    try {
    if (!sessionId) throw new Error("Firestore ID is undefined for collection classSessions at line 1530");
      await setDoc(doc(db, 'classSessions', sessionId), cleanObject(newSession));
      addAuditLog('START_CLASS_SESSION', `Started class session ${sessionId} for offering ${offeringId}`);
      
      // Auto notification trigger: Class started
      sendNotification({
        sender_id: offering.teacher_id || teacherId,
        sender_name: user?.name || 'Faculty Member',
        sender_role: 'TEACHER',
        recipient_id: offeringId,
        type: 'CLASS_STARTED',
        title: 'Class Session Started',
        message: `Class session ${sessionId} has started for course offering ${offeringId}. Please record your attendance.`,
        course_offering_id: offeringId,
        department_id: offering.department_id,
        priority: 'HIGH'
      }).catch(() => {});
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'classSessions');
    }

    return newSession;
  };

  const endClassSession = async (sessionId: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    
    setClassSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'COMPLETED', end_time: timeStr } : s));
    if (activeSession?.id === sessionId) {
      setActiveSession(null);
    }
    try {
    if (!sessionId) throw new Error("Firestore ID is undefined for collection classSessions at line 1563");
      await updateDoc(doc(db, 'classSessions', sessionId), {
        status: 'COMPLETED',
        end_time: timeStr
      });
      addAuditLog('END_CLASS_SESSION', `Completed class session ${sessionId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `classSessions/${sessionId}`);
    }
  };

  const cancelClassSession = async (sessionId: string) => {
    setClassSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'CANCELLED' } : s));
    if (activeSession?.id === sessionId) {
      setActiveSession(null);
    }
    try {
    if (!sessionId) throw new Error("Firestore ID is undefined for collection classSessions at line 1580");
      await updateDoc(doc(db, 'classSessions', sessionId), {
        status: 'CANCELLED'
      });
      addAuditLog('CANCEL_CLASS_SESSION', `Cancelled class session ${sessionId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `classSessions/${sessionId}`);
    }
  };

  const markSessionAttendance = async (
    sessionIdOrParams: string | {
      sessionId: string;
      studentId: string;
      status: AttendanceStatus;
      method?: RecognitionMethod;
      similarity?: number;
      forceOverride?: boolean;
      period?: string;
      reason?: string;
    },
    studentIdParam?: string,
    statusParam?: AttendanceStatus,
    methodParam: RecognitionMethod = 'FACE_RECOGNITION',
    similarityParam: number = 0.95
  ): Promise<{ success: boolean; code?: string; message?: string; record?: Attendance }> => {
    let sessionId: string;
    let studentId: string;
    let status: AttendanceStatus;
    let method: RecognitionMethod = 'FACE_RECOGNITION';
    let similarity: number = 0.95;
    let forceOverride = false;
    let period: string | undefined = undefined;
    let reason: string | undefined = undefined;

    if (typeof sessionIdOrParams === 'object' && sessionIdOrParams !== null) {
      sessionId = sessionIdOrParams.sessionId;
      studentId = sessionIdOrParams.studentId;
      status = sessionIdOrParams.status;
      method = sessionIdOrParams.method || 'FACE_RECOGNITION';
      similarity = sessionIdOrParams.similarity !== undefined ? sessionIdOrParams.similarity : 0.95;
      forceOverride = !!sessionIdOrParams.forceOverride;
      period = sessionIdOrParams.period;
      reason = sessionIdOrParams.reason;
    } else {
      sessionId = String(sessionIdOrParams);
      studentId = studentIdParam!;
      status = statusParam || 'PRESENT';
      method = methodParam;
      similarity = similarityParam;
    }

    // Step 1: Verify student exists
    const student = students.find(s => s.id === studentId || s.user_id === studentId);
    if (!student) {
      return {
        success: false,
        code: 'STUDENT_NOT_FOUND',
        message: `Student with ID '${studentId}' does not exist in the academic system.`
      };
    }

    // Step 2: Verify active session exists
    const session = classSessions.find(s => s.id === sessionId) || (activeSession?.id === sessionId ? activeSession : null);
    if (!session) {
      return {
        success: false,
        code: 'SESSION_NOT_FOUND',
        message: `Class session '${sessionId}' was not found.`
      };
    }
    if (session.status === 'CANCELLED') {
      return {
        success: false,
        code: 'SESSION_CANCELLED',
        message: `Cannot record attendance for cancelled session '${sessionId}'.`
      };
    }

    // Step 3: Get course_offering_id from session
    const courseOfferingId = session.course_offering_id;

    // Step 4: Verify student is enrolled in that course offering
    const isEnrolled = enrollments.some(
      e => (e.student_id === student.id || e.student_id === student.user_id) &&
           e.course_offering_id === courseOfferingId &&
           e.status !== 'INACTIVE'
    );

    // Step 5: Verify student belongs to appropriate academic context
    const offering = courseOfferings.find(co => co.id === courseOfferingId);
    const matchesContext = isEnrolled || (
      offering && (
        !offering.department_id ||
        student.department_id === offering.department_id ||
        student.department === offering.department_id
      )
    );

    if (!isEnrolled && enrollments.length > 0 && !matchesContext) {
      return {
        success: false,
        code: 'NOT_ENROLLED',
        message: `Student ${student.name} (${student.id}) is not enrolled in course offering ${courseOfferingId}.`
      };
    }

    // Step 6: Check whether attendance already exists for that session using student_id + session_id
    const existingAttendance = attendances.find(
      a => a.session_id === sessionId && (a.student_id === student.id || a.student_id === studentId)
    );

    // Step 7: If already marked and not an explicit override, return ALREADY_MARKED
    if (existingAttendance && !forceOverride) {
      return {
        success: false,
        code: 'ALREADY_MARKED',
        message: `Attendance already marked as '${existingAttendance.status}' for student ${student.name} in session ${sessionId}.`,
        record: existingAttendance
      };
    }

    // Step 8: Otherwise create or update attendance
    const now = new Date();
    const timestampStr = now.toISOString();
    const dateStr = session.date || now.toISOString().split('T')[0];
    const canonicalDocId = existingAttendance ? existingAttendance.id : `att_${sessionId}_${student.id}`;

    const attendanceRecord: Attendance = {
      id: canonicalDocId,
      attendance_id: canonicalDocId,
      student_id: student.id,
      course_offering_id: courseOfferingId,
      session_id: sessionId,
      date: dateStr,
      period: period || session.room || undefined,
      status: status,
      recognition_method: method,
      similarity_score: similarity,
      marked_by: method === 'FACE_RECOGNITION' ? 'SYSTEM' : (user?.user_id || 'TEACHER'),
      timestamp: timestampStr,
      created_at: existingAttendance?.created_at || timestampStr,
      updated_at: timestampStr,
      modified_by: existingAttendance ? (user?.user_id || 'TEACHER') : undefined,
      modified_at: existingAttendance ? timestampStr : undefined,
      modification_reason: reason || (existingAttendance ? 'Manual override in active session' : undefined)
    };

    setAttendances(prev => {
      const filtered = prev.filter(a => !(a.session_id === sessionId && (a.student_id === student.id || a.student_id === studentId)));
      return [...filtered, attendanceRecord];
    });

    try {
    if (!canonicalDocId) throw new Error("Firestore ID is undefined for collection attendance at line 1734");
      await setDoc(doc(db, 'attendance', canonicalDocId), cleanObject(attendanceRecord));

      addAuditLog(
        existingAttendance ? 'UPDATE_ATTENDANCE' : 'CREATE_ATTENDANCE',
        `Recorded ${status} attendance for ${student.name} in session ${sessionId} via ${method}`
      );

      return {
        success: true,
        code: 'SUCCESS',
        message: `Attendance marked as ${status} successfully.`,
        record: attendanceRecord
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendance/${canonicalDocId}`);
      return {
        success: false,
        code: 'FIRESTORE_ERROR',
        message: 'Failed to write attendance record to database.',
        record: attendanceRecord
      };
    }
  };

  const processAiRecognitionToAttendance = async (params: {
    student_id?: string | null;
    similarity?: number;
    session_id?: string;
    quality_score?: number;
    temporal_score?: number;
  }): Promise<AiRecognitionResult> => {
    const similarity = params.similarity !== undefined ? params.similarity : 0.95;

    // Step 1 - 4: Resolve student & FAISS confidence
    if (!params.student_id || params.student_id === 'UNKNOWN' || similarity < 0.45) {
      return {
        student_id: 'UNKNOWN',
        name: 'Unknown Person',
        similarity: similarity,
        recognition_status: 'UNKNOWN',
        enrollment_status: 'UNKNOWN',
        attendance_status: 'UNKNOWN',
        message: 'Face not recognized in FAISS embeddings index.'
      };
    }

    const student = students.find(s => s.id === params.student_id || s.user_id === params.student_id || s.registrationNumber === params.student_id);
    if (!student) {
      return {
        student_id: params.student_id,
        name: 'Unknown Student',
        similarity: similarity,
        recognition_status: 'UNKNOWN',
        enrollment_status: 'UNKNOWN',
        attendance_status: 'UNKNOWN',
        message: `Student ID '${params.student_id}' not found in database.`
      };
    }

    // Step 5: Check quality score
    if (params.quality_score !== undefined && params.quality_score < 0.5) {
      return {
        student_id: student.id,
        name: student.name,
        similarity: similarity,
        recognition_status: 'LOW_QUALITY',
        enrollment_status: 'UNKNOWN',
        attendance_status: 'UNKNOWN',
        message: 'Face image quality too low for confidence matching.'
      };
    }

    // Step 6: Check temporal score
    if (params.temporal_score !== undefined && params.temporal_score < 0.7) {
      return {
        student_id: student.id,
        name: student.name,
        similarity: similarity,
        recognition_status: 'VERIFYING',
        enrollment_status: 'UNKNOWN',
        attendance_status: 'UNKNOWN',
        message: 'Temporal verification in progress...'
      };
    }

    // Step 7: Get active ClassSession
    const targetSessionId = params.session_id || activeSession?.id;
    const session = classSessions.find(cs => cs.id === targetSessionId && cs.status === 'ACTIVE') || (activeSession?.id === targetSessionId ? activeSession : null);

    if (!session || session.status !== 'ACTIVE') {
      return {
        student_id: student.id,
        name: student.name,
        similarity: similarity,
        recognition_status: 'HIGH_CONFIDENCE',
        enrollment_status: 'UNKNOWN',
        attendance_status: 'NO_ACTIVE_SESSION',
        message: 'No active class session found for attendance logging.'
      };
    }

    // Step 8 & 9: Resolve CourseOffering & check Enrollment
    const courseOfferingId = session.course_offering_id;
    const isEnrolled = enrollments.some(
      e => (e.student_id === student.id || e.student_id === student.user_id) &&
           e.course_offering_id === courseOfferingId &&
           e.status !== 'INACTIVE'
    );

    if (!isEnrolled && enrollments.length > 0) {
      return {
        student_id: student.id,
        name: student.name,
        similarity: similarity,
        recognition_status: 'HIGH_CONFIDENCE',
        enrollment_status: 'NOT_ENROLLED',
        attendance_status: 'NOT_ENROLLED',
        message: `Student ${student.name} is not enrolled in course offering ${courseOfferingId}.`
      };
    }

    // Step 10 & 11: Mark attendance & prevent duplicate attendance
    const result = await markSessionAttendance({
      studentId: student.id,
      sessionId: session.id,
      status: 'PRESENT',
      method: 'FACE_RECOGNITION',
      similarity: similarity
    });

    if (result.code === 'ALREADY_MARKED') {
      return {
        student_id: student.id,
        name: student.name,
        similarity: similarity,
        recognition_status: 'HIGH_CONFIDENCE',
        enrollment_status: 'ENROLLED',
        attendance_status: 'ALREADY_MARKED',
        message: `Attendance already marked for ${student.name}.`,
        record: result.record
      };
    }

    return {
      student_id: student.id,
      name: student.name,
      similarity: similarity,
      recognition_status: 'HIGH_CONFIDENCE',
      enrollment_status: 'ENROLLED',
      attendance_status: 'ATTENDANCE_MARKED',
      message: `Attendance marked successfully for ${student.name}.`,
      record: result.record
    };
  };

  const updateAttendanceRecord = async (id: string, data: Partial<Attendance> & { reason?: string }) => {
    const existing = attendances.find(a => a.id === id);
    if (!existing) return;

    const now = new Date().toISOString();
    const updated: Attendance = {
      ...existing,
      ...data,
      updated_at: now,
      modified_at: now,
      modified_by: user?.user_id || 'TEACHER',
      modification_reason: data.reason || existing.modification_reason
    };

    setAttendances(prev => prev.map(a => a.id === id ? updated : a));

    try {
    if (!id) throw new Error("Firestore ID is undefined for collection attendance at line 1907");
      await updateDoc(doc(db, 'attendance', id), updated as any);
      addAuditLog('UPDATE_ATTENDANCE', `Updated attendance record ${id} to status ${data.status || existing.status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `attendance/${id}`);
    }
  };

  const deleteAttendanceRecord = async (id: string) => {
    setAttendances(prev => prev.filter(a => a.id !== id));
    try {
    if (!id) throw new Error("Firestore ID is undefined for collection attendance at line 1918");
      await deleteDoc(doc(db, 'attendance', id));
      addAuditLog('DELETE_ATTENDANCE', `Deleted attendance record ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `attendance/${id}`);
    }
  };

  const getAttendancesBySession = (sessionId: string) => {
    return attendances.filter(a => a.session_id === sessionId);
  };

  const getAttendancesByStudent = (studentId: string) => {
    return attendances.filter(a => a.student_id === studentId);
  };

  const getAttendancesByCourseOffering = (courseOfferingId: string) => {
    return attendances.filter(a => a.course_offering_id === courseOfferingId);
  };

  const simulateDetection = async () => {
    if (students.length === 0) return;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toISOString().split('T')[0];

    const isUnknown = Math.random() > 0.7;

    if (isUnknown) {
      const newUnknown: UnknownPerson = {
        id: `U00${unknownPersons.length + 1}`,
        imageUrl: '',
        time: timeString,
        status: 'Pending',
      };
      setUnknownPersons(prev => [newUnknown, ...prev]);
    } else {
      const student = students[Math.floor(Math.random() * students.length)];
      let currentPeriod = null;
      for (const p of settings.timetable || []) {
        if (timeString >= p.startTime && timeString <= p.endTime) {
          currentPeriod = p;
          break;
        }
      }
      
      const subject = currentPeriod ? currentPeriod.subject : 'General Entry';
      const isPresent = attendanceLogs.some(a => a.studentId === student.id && a.date === dateString && a.subject === subject);
      
      if (!isPresent) {
        let isLate = false;
        if (currentPeriod) {
          const [startHour, startMin] = currentPeriod.startTime.split(':').map(Number);
          const gracePeriod = settings.lateEntryGracePeriod || 10;
          const threshold = new Date(now);
          threshold.setHours(startHour, startMin + gracePeriod, 0, 0);
          isLate = now > threshold;
        } else {
          const [lateHour, lateMinute] = settings.lateEntryTime.split(':').map(Number);
          isLate = now.getHours() > lateHour || (now.getHours() === lateHour && now.getMinutes() > lateMinute);
        }

        const newLog: Omit<AttendanceRecord, 'id'> = {
          studentId: student.id,
          studentName: student.name,
          department: student.department,
          subject: subject,
          loginTime: timeString,
          logoutTime: null,
          date: dateString,
          duration: null,
          status: isLate ? 'Late' : 'Present',
        };
        await addAttendanceLog(newLog);
      }
    }
  };

  const simulateAutoLogout = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const activeLogs = attendanceLogs.filter(log => !log.logoutTime);
    if (activeLogs.length === 0) return;
    
    const targetLog = activeLogs[0];
    updateDoc(doc(db, 'attendanceLogs', targetLog.id), {
      logoutTime: timeString,
      duration: `${settings.autoLogoutTime}m (Auto)`
    }).catch(error => {
      handleFirestoreError(error, OperationType.UPDATE, `attendanceLogs/${targetLog.id}`);
    });
  };

  const calculateGrade = (marks: number, maxMarks: number = 100): { grade: string; grade_point: number; status: 'PASS' | 'FAIL' } => {
    if (maxMarks <= 0) return { grade: 'F', grade_point: 0, status: 'FAIL' };
    const percentage = (marks / maxMarks) * 100;
    if (percentage >= 90) return { grade: 'O', grade_point: 10, status: 'PASS' };
    if (percentage >= 80) return { grade: 'A+', grade_point: 9, status: 'PASS' };
    if (percentage >= 70) return { grade: 'A', grade_point: 8, status: 'PASS' };
    if (percentage >= 60) return { grade: 'B+', grade_point: 7, status: 'PASS' };
    if (percentage >= 50) return { grade: 'B', grade_point: 6, status: 'PASS' };
    if (percentage >= 40) return { grade: 'C', grade_point: 5, status: 'PASS' };
    return { grade: 'F', grade_point: 0, status: 'FAIL' };
  };

  const addExam = async (examData: Omit<Exam, 'id'>): Promise<string> => {
    if (!user || (!['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'].includes(user.role as string))) {
      throw new Error("Unauthorized: Only administrators and teachers can create examinations.");
    }
    const examName = examData.name || examData.exam_name;
    const existing = exams.find(e => 
      (e.name || e.exam_name) === examName &&
      e.course_id === examData.course_id &&
      e.date === examData.date
    );
    if (existing) {
      return existing.id;
    }

    const id = `exam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newExam: Exam = {
      ...examData,
      id,
      exam_id: id,
      created_at: now,
      updated_at: now
    };
    const cleanExam = cleanObject(newExam);
    try {
    if (!id) throw new Error("Firestore ID is undefined for collection exams at line 2039");
      await setDoc(doc(db, 'exams', id), cleanExam);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `exams/${id}`);
    }
    setExams(prev => [newExam, ...prev]);
    await addAuditLog('CREATE_EXAM', `Created examination '${newExam.exam_name}' (${newExam.exam_type}) for department ${newExam.department_id || 'All'}`);
    return id;
  };

  const updateExam = async (id: string, data: Partial<Exam>): Promise<void> => {
    if (!user || (!['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'].includes(user.role as string))) {
      throw new Error("Unauthorized: Only administrators and teachers can update examinations.");
    }
    const now = new Date().toISOString();
    const updated = { ...data, updated_at: now };
    const cleanUpdated = cleanObject(updated);
    try {
    if (!id) throw new Error("Firestore ID is undefined for collection exams at line 2056");
      await updateDoc(doc(db, 'exams', id), cleanUpdated);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `exams/${id}`);
    }
    setExams(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e));
    await addAuditLog('UPDATE_EXAM', `Updated examination details for ID ${id}`);
  };

  const deleteExam = async (id: string): Promise<void> => {
    if (!user || (!['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_ADMIN'].includes(user.role as string))) {
      throw new Error("Unauthorized: Only administrators can delete examinations.");
    }
    try {
    if (!id) throw new Error("Firestore ID is undefined for collection exams at line 2070");
      await deleteDoc(doc(db, 'exams', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `exams/${id}`);
    }
    setExams(prev => prev.filter(e => e.id !== id && e.exam_id !== id));
    await addAuditLog('DELETE_EXAM', `Deleted examination ${id}`);
  };

  const saveResult = async (params: {
    student_id: string;
    course_offering_id: string;
    exam_id: string;
    marks: number;
    maximum_marks: number;
    reason?: string;
    isPublished?: boolean;
  }): Promise<Result> => {
    if (!user) throw new Error("Authentication required to enter or edit marks");

    const offering = courseOfferings.find(co => co.id === params.course_offering_id);
    if (user.role === 'TEACHER') {
      const currentTeacher = teachers.find(t => t.user_id === user.user_id || t.id === user.user_id || t.email === user.email);
      if (offering && currentTeacher && offering.teacher_id !== currentTeacher.id && offering.teacher_id !== currentTeacher.user_id) {
        throw new Error(`Unauthorized: Teachers can only enter marks for their assigned course offering (${offering.id}).`);
      }
    } else if (user.role === 'DEPARTMENT_ADMIN') {
      if (offering && offering.department_id && user.department_id && offering.department_id !== user.department_id) {
        throw new Error(`Unauthorized: Department Admin can only manage results within their department.`);
      }
    } else if (user.role === 'STUDENT') {
      throw new Error("Students are strictly forbidden from modifying exam marks or results.");
    }

    const existing = results.find(r => 
      (r.student_id === params.student_id) && 
      r.course_offering_id === params.course_offering_id && 
      r.exam_id === params.exam_id
    );

    if (existing?.published_at && params.reason) {
      await addAuditLog(
        'RESULT_MODIFICATION',
        `Modified published result for student ${params.student_id} in offering ${params.course_offering_id}, exam ${params.exam_id}. Old marks: ${existing.marks}/${existing.maximum_marks} -> New marks: ${params.marks}/${params.maximum_marks}. Reason: ${params.reason}`
      );
    }

    const { grade, grade_point, status } = calculateGrade(params.marks, params.maximum_marks);
    const now = new Date().toISOString();
    const canonicalId = existing?.id || `res_${params.student_id}_${params.course_offering_id}_${params.exam_id}`.replace(/[^a-zA-Z0-9_-]/g, '_');

    const resultRecord: Result = {
      id: canonicalId,
      result_id: canonicalId,
      student_id: params.student_id,
      course_offering_id: params.course_offering_id,
      exam_id: params.exam_id,
      marks: Number(params.marks),
      maximum_marks: Number(params.maximum_marks),
      grade,
      grade_point,
      result_status: status,
      published_at: params.isPublished ? (existing?.published_at || now) : (params.isPublished === false ? undefined : existing?.published_at),
      published_by: params.isPublished ? (existing?.published_by || user.user_id || user.email || 'ADMIN') : existing?.published_by,
      created_at: existing?.created_at || now,
      updated_at: now,
      last_modified_by: user.user_id || user.email,
      last_modified_reason: params.reason || existing?.last_modified_reason
    };

    try {
    if (!canonicalId) throw new Error("Firestore ID is undefined for collection results at line 2141");
      await setDoc(doc(db, 'results', canonicalId), cleanObject(resultRecord), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `results/${canonicalId}`);
    }

    setResults(prev => {
      const idx = prev.findIndex(r => r.id === canonicalId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = resultRecord;
        return copy;
      }
      return [resultRecord, ...prev];
    });

    return resultRecord;
  };

  const saveBatchResults = async (
    records: Array<{ student_id: string; course_offering_id: string; exam_id: string; marks: number; maximum_marks: number }>,
    isPublished?: boolean,
    reason?: string
  ): Promise<void> => {
    for (const rec of records) {
      await saveResult({
        ...rec,
        isPublished,
        reason
      });
    }
  };

  const publishResults = async (resultIds: string[]): Promise<void> => {
    if (!user || (!['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'].includes(user.role as string))) {
      throw new Error("Unauthorized to publish results.");
    }
    const now = new Date().toISOString();
    const publisher = user.user_id || user.email || 'ADMIN';
    
    for (const id of resultIds) {
      try {
    if (!id) throw new Error("Firestore ID is undefined for collection results at line 2183");
        await updateDoc(doc(db, 'results', id), {
          published_at: now,
          published_by: publisher,
          updated_at: now
        });
      } catch (e) {}
    }

    setResults(prev => prev.map(r => resultIds.includes(r.id) ? { ...r, published_at: now, published_by: publisher, updated_at: now } : r));
    await addAuditLog('PUBLISH_RESULTS', `Published ${resultIds.length} academic result record(s)`);

    // Auto notification trigger: Result published
    const publishedRecords = results.filter(r => resultIds.includes(r.id));
    for (const resRec of publishedRecords) {
      sendNotification({
        sender_id: user.user_id || 'ADMIN',
        sender_name: user.name || 'Academic Administration',
        sender_role: user.role,
        recipient_id: resRec.student_id,
        type: 'EXAM_RESULT',
        title: 'Exam Result Published',
        message: `Your result for course offering ${resRec.course_offering_id} (Grade: ${resRec.grade || 'Published'}) has been published.`,
        course_offering_id: resRec.course_offering_id,
        priority: 'NORMAL'
      }).catch(() => {});
    }
  };

  const unpublishResults = async (resultIds: string[]): Promise<void> => {
    if (!user || (!['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_ADMIN'].includes(user.role as string))) {
      throw new Error("Unauthorized: Only administrators can unpublish results.");
    }
    const now = new Date().toISOString();
    for (const id of resultIds) {
      try {
    if (!id) throw new Error("Firestore ID is undefined for collection results at line 2219");
        await updateDoc(doc(db, 'results', id), {
          published_at: null,
          updated_at: now
        });
      } catch (e) {}
    }
    setResults(prev => prev.map(r => resultIds.includes(r.id) ? { ...r, published_at: undefined, updated_at: now } : r));
    await addAuditLog('UNPUBLISH_RESULTS', `Unpublished ${resultIds.length} academic result record(s)`);
  };

  const deleteResult = async (id: string): Promise<void> => {
    if (!user || (!['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_ADMIN'].includes(user.role as string))) {
      throw new Error("Unauthorized: Only administrators can delete result records.");
    }
    try {
    if (!id) throw new Error("Firestore ID is undefined for collection results at line 2235");
      await deleteDoc(doc(db, 'results', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `results/${id}`);
    }
    setResults(prev => prev.filter(r => r.id !== id));
    await addAuditLog('DELETE_RESULT', `Deleted result record ${id}`);
  };

  const addAuditLog = async (action: string, details: string) => {
    if (!user) return;
    const newId = `LOG${Date.now()}`;
    const log: AuditLog = {
      action,
      details,
      userId: user.user_id || user.id || 'unknown',
      userEmail: user.email || 'unknown@example.com',
      timestamp: new Date().toISOString()
    };
    try {
    if (!newId) throw new Error("Firestore ID is undefined for collection auditLogs at line 2255");
      await setDoc(doc(db, 'auditLogs', newId), cleanObject(log));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'auditLogs');
    }
  };

  const sendNotification = async (
    payload: Omit<Notification, 'id' | 'created_at' | 'status'> & { id?: string; created_at?: string; status?: 'UNREAD' | 'READ' }
  ): Promise<Notification> => {
    const notifId = payload.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = payload.created_at || new Date().toISOString();
    
    let senderName = payload.sender_name;
    let senderRole = payload.sender_role;
    if (!senderName && user) {
      senderName = user.name || user.email?.split('@')[0] || 'User';
      senderRole = user.role;
    }

    const newNotif: Notification = {
      ...payload,
      id: notifId,
      notification_id: notifId,
      created_at: now,
      status: payload.status || 'UNREAD',
      sender_name: senderName || 'System',
      sender_role: senderRole || 'SYSTEM',
    };

    setNotifications(prev => [newNotif, ...prev.filter(n => n.id !== notifId)]);

    try {
    if (!notifId) throw new Error("Firestore ID is undefined for collection notifications at line 2288");
      await setDoc(doc(db, 'notifications', notifId), cleanObject(newNotif));
      await addAuditLog('SEND_NOTIFICATION', `Notification sent to ${payload.recipient_id}: "${payload.title}"`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `notifications/${notifId}`);
    }

    return newNotif;
  };

  const markNotificationAsRead = async (id: string): Promise<void> => {
    const now = new Date().toISOString();
    setNotifications(prev => prev.map(n => (n.id === id || n.notification_id === id) ? { ...n, status: 'READ', read_at: now } : n));
    try {
    if (!id) throw new Error("Firestore ID is undefined for collection notifications at line 2302");
      await updateDoc(doc(db, 'notifications', id), {
        status: 'READ',
        read_at: now
      });
    } catch (e) {
      // remote error non-blocking
    }
  };

  const markAllNotificationsAsRead = async (recipientId?: string): Promise<void> => {
    const targetUserId = recipientId || user?.user_id || user?.id;
    const now = new Date().toISOString();
    
    const targetNotifs = notifications.filter(n => {
      if (n.status === 'READ') return false;
      if (recipientId) return n.recipient_id === recipientId;
      return true;
    });

    setNotifications(prev => prev.map(n => {
      if (targetNotifs.some(tn => tn.id === n.id || tn.id === n.notification_id)) {
        return { ...n, status: 'READ', read_at: now };
      }
      return n;
    }));

    for (const notif of targetNotifs) {
      try {
        await updateDoc(doc(db, 'notifications', notif.id), {
          status: 'READ',
          read_at: now
        });
      } catch (e) {}
    }
  };

  const deleteNotification = async (id: string): Promise<void> => {
    setNotifications(prev => prev.filter(n => n.id !== id && n.notification_id !== id));
    try {
    if (!id) throw new Error("Firestore ID is undefined for collection notifications at line 2342");
      await deleteDoc(doc(db, 'notifications', id));
      addAuditLog('DELETE_NOTIFICATION', `Deleted notification ${id}`);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const getUserNotifications = (userId?: string, role?: string, departmentId?: string): Notification[] => {
    const currentUserId = userId || user?.user_id || user?.id || '';
    const currentRole = role || user?.role || '';
    const currentDeptId = departmentId || user?.department_id || '';

    if (!currentUserId && !currentRole) return [];

    // Super Admin has full view of notifications
    if (currentRole === 'SUPER_ADMIN') {
      return notifications;
    }

    return notifications.filter(n => {
      // 1. Direct recipient match
      if (n.recipient_id === currentUserId) return true;
      if (n.recipient_id === 'ALL') return true;

      // 2. Role-based broadcast match
      if (currentRole === 'STUDENT' && (n.recipient_id === 'ALL_STUDENTS' || n.recipient_id === 'STUDENTS')) return true;
      if (currentRole === 'TEACHER' && (n.recipient_id === 'ALL_TEACHERS' || n.recipient_id === 'TEACHERS')) return true;
      if (currentRole === 'DEPARTMENT_ADMIN' && (n.recipient_id === 'ALL_DEPT_ADMINS' || n.recipient_id === 'DEPARTMENT_ADMINS')) return true;

      // 3. Department match
      if (currentDeptId && (n.department_id === currentDeptId || n.recipient_id === currentDeptId)) {
        if (n.recipient_id === 'DEPT_STUDENTS' && currentRole === 'STUDENT') return true;
        if (n.recipient_id === 'DEPT_TEACHERS' && currentRole === 'TEACHER') return true;
        if (n.recipient_id === currentDeptId || n.recipient_id === 'DEPT_ALL') return true;
      }

      // 4. Course offering match
      if (n.course_offering_id) {
        if (currentRole === 'STUDENT') {
          const isEnrolled = enrollments.some(e => (e.student_id === currentUserId || e.student_id === user?.user_id) && e.course_offering_id === n.course_offering_id);
          if (isEnrolled) return true;
        }
        if (currentRole === 'TEACHER') {
          const teaches = courseOfferings.some(co => (co.teacher_id === currentUserId || co.teacher_id === user?.user_id) && co.id === n.course_offering_id);
          if (teaches) return true;
        }
      }

      // 5. Sender match (so sender can view what they sent)
      if (n.sender_id === currentUserId || (user?.email && n.sender_id === user.email)) {
        return true;
      }

      return false;
    });
  };

  const getUserUnreadCount = (userId?: string, role?: string, departmentId?: string): number => {
    const currentUserId = userId || user?.user_id || user?.id || '';
    const userNotifs = getUserNotifications(userId, role, departmentId);
    return userNotifs.filter(n => n.status === 'UNREAD' && n.sender_id !== currentUserId).length;
  };

  return (
    <DataContext.Provider
      value={{
        students,
        teachers,
        users,
        courses,
        courseOfferings,
        enrollments,
        timetables,
        classSessions,
        activeSession,
        attendances,
        setActiveSession,
        addTimetable,
        updateTimetable,
        deleteTimetable,
        startClassSession,
        endClassSession,
        cancelClassSession,
        markSessionAttendance,
        processAiRecognitionToAttendance,
        updateAttendanceRecord,
        deleteAttendanceRecord,
        getAttendancesBySession,
        getAttendancesByStudent,
        getAttendancesByCourseOffering,
        deletedRecords,
        attendanceLogs,
        unknownPersons,
        exams,
        results,
        addExam,
        updateExam,
        deleteExam,
        saveResult,
        addResult: async (data: any) => {
          return saveResult({
            student_id: data.student_id,
            course_offering_id: data.course_offering_id || data.course_id || '',
            exam_id: data.exam_id,
            marks: data.marks_obtained ?? data.marks ?? 0,
            maximum_marks: data.max_marks ?? data.maximum_marks ?? 100,
            isPublished: data.is_published ?? true
          });
        },
        updateResult: async (id: string, data: any) => {
          try {
            await updateDoc(doc(db, 'results', id), {
              ...data,
              updated_at: new Date().toISOString()
            });
          } catch (e) {
            handleFirestoreError(e, OperationType.UPDATE, `results/${id}`);
          }
        },
        saveBatchResults,
        publishResults,
        unpublishResults,
        deleteResult,
        calculateGrade,
        auditLogs,
        settings,
        addAuditLog,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        addStudent,
        updateStudent,
        deleteStudent,
        addUser,
        updateUser,
        deleteUser,
        restoreRecord,
        deleteRecordPermanently,
        addCourse,
        addCourseOffering,
        addEnrollment,
        deleteEnrollment,
        updateCourse,
        updateCourseOffering,
        deleteCourse,
        deleteCourseOffering,
        simulateDetection,
        updateSettings,
        simulateAutoLogout,
        addAttendanceLog,
        updateStudentImages,
        addDatasetImage,
        deleteDatasetImage,
        seedSampleData,
        purgePreloadedData: async () => {
          if (!user || user.role !== 'SUPER_ADMIN') {
            throw new Error("Unauthorized: Only Super Admin can purge data.");
          }
          const collectionsToPurge = [
            'departments',
            'programs',
            'batches',
            'academicYears',
            'semesters',
            'sections',
            'courses',
            'courseOfferings',
            'notifications'
          ];
          try {
            for (const colName of collectionsToPurge) {
              const snapshot = await getDocs(collection(db, colName));
              const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, colName, document.id)));
              await Promise.all(deletePromises);
            }
            await addAuditLog('PURGE_DATA', 'Purged all preloaded academic structure, courses, and notification data.');
          } catch (err) {
            console.warn("Error purging data:", err);
            throw err;
          }
        },
        updateUnknownPersonStatus,
        addUnknownPerson,
        notifications,
        sendNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        getUserNotifications,
        getUserUnreadCount
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
