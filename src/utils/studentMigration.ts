import { Student } from '../types';

export const normalizeStudent = (raw: any): Student => {
  const id = raw.id || raw.student_id || raw.studentId || raw.user_id || `S${Date.now().toString().slice(-6)}`;
  const fullName = raw.name || [raw.firstName, raw.lastName].filter(Boolean).join(' ') || 'Student';
  const firstName = raw.firstName || fullName.split(' ')[0] || 'Student';
  const lastName = raw.lastName || fullName.split(' ').slice(1).join(' ') || '';

  return {
    id,
    user_id: raw.user_id || id,
    name: fullName,
    firstName,
    lastName,
    email: raw.email || `${id.toLowerCase()}@smartattend.ai`,
    usn: raw.usn || raw.registrationNumber || id,
    registrationNumber: raw.registrationNumber || raw.usn || id,
    department_id: raw.department_id || raw.department || 'dept-cse',
    department: raw.department || 'Computer Science & Engineering',
    program_id: raw.program_id || 'prog-btech-cse',
    batch_id: raw.batch_id || 'batch-2023-2027',
    current_academic_year_id: raw.current_academic_year_id || 'ay-2024-2025',
    current_semester_id: raw.current_semester_id || 'sem-4',
    semester: raw.semester || raw.current_semester_id || '4',
    current_section_id: raw.current_section_id || 'sec-a',
    section: raw.section || 'A',
    year: raw.year || '2nd Year',
    images: Number(raw.images) || 0,
    profilePic: raw.profilePic || raw.imageUrl || '',
    modeOfAdmission: raw.modeOfAdmission || 'General Merit',
    dateOfAdmission: raw.dateOfAdmission || new Date().toISOString().split('T')[0],
    dateOfBirth: raw.dateOfBirth || '2004-01-01',
    contactNumber: raw.contactNumber || '',
    guardianName: raw.guardianName || '',
    guardianContact: raw.guardianContact || '',
    status: raw.status || 'ACTIVE',
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};
