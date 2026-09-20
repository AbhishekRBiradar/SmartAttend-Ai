import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Department, Program, AcademicYear, Batch, Semester, Section } from '../types';
import { useAuth } from './AuthContext';

interface AcademicContextType {
  departments: Department[];
  programs: Program[];
  academicYears: AcademicYear[];
  batches: Batch[];
  semesters: Semester[];
  sections: Section[];
  addDepartment: (dept: Omit<Department, 'id'> & { id?: string }) => Promise<void>;
  updateDepartment: (id: string, data: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  addProgram: (prog: Omit<Program, 'id'> & { id?: string }) => Promise<void>;
  updateProgram: (id: string, data: Partial<Program>) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  addAcademicYear: (year: Omit<AcademicYear, 'id'> & { id?: string }) => Promise<void>;
  updateAcademicYear: (id: string, data: Partial<AcademicYear>) => Promise<void>;
  deleteAcademicYear: (id: string) => Promise<void>;
  addBatch: (batch: Omit<Batch, 'id'> & { id?: string }) => Promise<void>;
  updateBatch: (id: string, data: Partial<Batch>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  addSemester: (sem: Omit<Semester, 'id'> & { id?: string }) => Promise<void>;
  updateSemester: (id: string, data: Partial<Semester>) => Promise<void>;
  deleteSemester: (id: string) => Promise<void>;
  addSection: (sec: Omit<Section, 'id'> & { id?: string }) => Promise<void>;
  updateSection: (id: string, data: Partial<Section>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
}

const defaultDepartments: Department[] = [
  { id: 'dept-cse', name: 'Computer Science & Engineering', code: 'CSE', status: 'ACTIVE', description: 'Department of Computer Science & Engineering' },
  { id: 'dept-ise', name: 'Information Science & Engineering', code: 'ISE', status: 'ACTIVE', description: 'Department of Information Science & Engineering' },
  { id: 'dept-ece', name: 'Electronics & Communication', code: 'ECE', status: 'ACTIVE', description: 'Department of Electronics & Communication' },
  { id: 'dept-ca', name: 'Computer Applications', code: 'MCA/BCA', status: 'ACTIVE', description: 'Department of Computer Applications' }
];

const defaultPrograms: Program[] = [
  { id: 'prog-btech-cse', department_id: 'dept-cse', name: 'B.Tech in Computer Science', code: 'BT-CSE', degree_type: 'Undergraduate', duration_years: 4, total_semesters: 8, status: 'ACTIVE' },
  { id: 'prog-btech-ise', department_id: 'dept-ise', name: 'B.Tech in Information Science', code: 'BT-ISE', degree_type: 'Undergraduate', duration_years: 4, total_semesters: 8, status: 'ACTIVE' },
  { id: 'prog-bca', department_id: 'dept-ca', name: 'Bachelor of Computer Applications', code: 'BCA', degree_type: 'Undergraduate', duration_years: 3, total_semesters: 6, status: 'ACTIVE' }
];

const defaultAcademicYears: AcademicYear[] = [
  { id: 'ay-2024-2025', name: '2024-2025', is_current: true, status: 'ACTIVE' },
  { id: 'ay-2025-2026', name: '2025-2026', is_current: false, status: 'ACTIVE' }
];

const defaultBatches: Batch[] = [
  { id: 'batch-2021-2025', name: 'Batch 2021-2025', start_year: 2021, end_year: 2025, department_id: 'dept-cse', status: 'ACTIVE' },
  { id: 'batch-2022-2026', name: 'Batch 2022-2026', start_year: 2022, end_year: 2026, department_id: 'dept-cse', status: 'ACTIVE' },
  { id: 'batch-2023-2027', name: 'Batch 2023-2027', start_year: 2023, end_year: 2027, department_id: 'dept-cse', status: 'ACTIVE' },
  { id: 'batch-2024-2028', name: 'Batch 2024-2028', start_year: 2024, end_year: 2028, department_id: 'dept-cse', status: 'ACTIVE' }
];

const defaultSemesters: Semester[] = [
  { id: 'sem-1', semester_number: 1, name: 'Semester 1', status: 'ACTIVE' },
  { id: 'sem-2', semester_number: 2, name: 'Semester 2', status: 'ACTIVE' },
  { id: 'sem-3', semester_number: 3, name: 'Semester 3', status: 'ACTIVE' },
  { id: 'sem-4', semester_number: 4, name: 'Semester 4', status: 'ACTIVE' },
  { id: 'sem-5', semester_number: 5, name: 'Semester 5', status: 'ACTIVE' },
  { id: 'sem-6', semester_number: 6, name: 'Semester 6', status: 'ACTIVE' },
  { id: 'sem-7', semester_number: 7, name: 'Semester 7', status: 'ACTIVE' },
  { id: 'sem-8', semester_number: 8, name: 'Semester 8', status: 'ACTIVE' }
];

const defaultSections: Section[] = [
  { id: 'sec-a', name: 'Section A', max_capacity: 60, status: 'ACTIVE' },
  { id: 'sec-b', name: 'Section B', max_capacity: 60, status: 'ACTIVE' },
  { id: 'sec-c', name: 'Section C', max_capacity: 60, status: 'ACTIVE' }
];

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export const AcademicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAuthReady } = useAuth();
  const [departments, setDepartments] = useState<Department[]>(defaultDepartments);
  const [programs, setPrograms] = useState<Program[]>(defaultPrograms);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(defaultAcademicYears);
  const [batches, setBatches] = useState<Batch[]>(defaultBatches);
  const [semesters, setSemesters] = useState<Semester[]>(defaultSemesters);
  const [sections, setSections] = useState<Section[]>(defaultSections);

  useEffect(() => {
    if (!isAuthenticated || !isAuthReady) return;

    const unsubDepts = onSnapshot(collection(db, 'departments'), (snapshot) => {
      if (!snapshot.empty) {
        setDepartments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department)));
      }
    }, () => {});

    const unsubProgs = onSnapshot(collection(db, 'programs'), (snapshot) => {
      if (!snapshot.empty) {
        setPrograms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Program)));
      }
    }, () => {});

    const unsubYears = onSnapshot(collection(db, 'academicYears'), (snapshot) => {
      if (!snapshot.empty) {
        setAcademicYears(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicYear)));
      }
    }, () => {});

    const unsubBatches = onSnapshot(collection(db, 'batches'), (snapshot) => {
      if (!snapshot.empty) {
        setBatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Batch)));
      }
    }, () => {});

    const unsubSemesters = onSnapshot(collection(db, 'semesters'), (snapshot) => {
      if (!snapshot.empty) {
        setSemesters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Semester)));
      }
    }, () => {});

    const unsubSections = onSnapshot(collection(db, 'sections'), (snapshot) => {
      if (!snapshot.empty) {
        setSections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Section)));
      }
    }, () => {});

    return () => {
      unsubDepts();
      unsubProgs();
      unsubYears();
      unsubBatches();
      unsubSemesters();
      unsubSections();
    };
  }, [isAuthenticated, isAuthReady]);

  const addDepartment = async (dept: Omit<Department, 'id'> & { id?: string }) => {
    const email = dept.admin_email || dept.email;
    if (email) {
      const normEmail = email.trim().toLowerCase();
      const emailExists = departments.some(d => ((d.admin_email || d.email || '').trim().toLowerCase() === normEmail && d.id !== dept.id));
      if (emailExists) {
        throw new Error('A department with this email address already exists.');
      }
    }
    const id = dept.id || `dept-${Date.now()}`;
    const newDept: Department = { ...dept, id, status: dept.status || 'ACTIVE' };
    setDepartments(prev => [...prev.filter(d => d.id !== id), newDept]);
    try {
      await setDoc(doc(db, 'departments', id), newDept);
      const email = dept.admin_email || dept.email;
      if (email) {
        const userId = `user-dept-${id}`;
        const deptAdminUser = {
          user_id: userId,
          name: `${dept.name || 'Department'} Admin`,
          email: email.trim().toLowerCase(),
          role: 'DEPARTMENT_ADMIN',
          department_id: id,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', userId), deptAdminUser, { merge: true });
      }
    } catch (e) {
      console.warn("Failed to write department to firestore", e);
    }
  };

  const updateDepartment = async (id: string, data: Partial<Department>) => {
    const email = data.admin_email || data.email;
    if (email) {
      const normEmail = email.trim().toLowerCase();
      const emailExists = departments.some(d => ((d.admin_email || d.email || '').trim().toLowerCase() === normEmail && d.id !== id));
      if (emailExists) {
        throw new Error('A department with this email address already exists.');
      }
    }
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
    try {
      await updateDoc(doc(db, 'departments', id), data);
      const email = data.admin_email || data.email;
      if (email) {
        const userId = `user-dept-${id}`;
        const deptAdminUser = {
          user_id: userId,
          email: email.trim().toLowerCase(),
          role: 'DEPARTMENT_ADMIN',
          department_id: id,
          status: 'ACTIVE',
          updated_at: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', userId), deptAdminUser, { merge: true });
      }
    } catch (e) {
      console.warn("Failed to update department", e);
    }
  };

  const deleteDepartment = async (id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
    try {
      await deleteDoc(doc(db, 'departments', id));
    } catch (e) {
      console.warn("Failed to delete department", e);
    }
  };

  const addProgram = async (prog: Omit<Program, 'id'> & { id?: string }) => {
    const id = prog.id || `prog-${Date.now()}`;
    const newProg: Program = { ...prog, id, status: prog.status || 'ACTIVE' };
    setPrograms(prev => [...prev.filter(p => p.id !== id), newProg]);
    try {
      await setDoc(doc(db, 'programs', id), newProg);
    } catch (e) {
      console.warn("Failed to write program", e);
    }
  };

  const updateProgram = async (id: string, data: Partial<Program>) => {
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    try {
      await updateDoc(doc(db, 'programs', id), data);
    } catch (e) {
      console.warn("Failed to update program", e);
    }
  };

  const deleteProgram = async (id: string) => {
    setPrograms(prev => prev.filter(p => p.id !== id));
    try {
      await deleteDoc(doc(db, 'programs', id));
    } catch (e) {
      console.warn("Failed to delete program", e);
    }
  };

  const addAcademicYear = async (year: Omit<AcademicYear, 'id'> & { id?: string }) => {
    const id = year.id || `ay-${Date.now()}`;
    const newYear: AcademicYear = { ...year, id, status: year.status || 'ACTIVE' };
    setAcademicYears(prev => [...prev.filter(y => y.id !== id), newYear]);
    try {
      await setDoc(doc(db, 'academicYears', id), newYear);
    } catch (e) {
      console.warn("Failed to write academic year", e);
    }
  };

  const updateAcademicYear = async (id: string, data: Partial<AcademicYear>) => {
    setAcademicYears(prev => prev.map(y => y.id === id ? { ...y, ...data } : y));
    try {
      await updateDoc(doc(db, 'academicYears', id), data);
    } catch (e) {
      console.warn("Failed to update academic year", e);
    }
  };

  const deleteAcademicYear = async (id: string) => {
    setAcademicYears(prev => prev.filter(y => y.id !== id));
    try {
      await deleteDoc(doc(db, 'academicYears', id));
    } catch (e) {
      console.warn("Failed to delete academic year", e);
    }
  };

  const addBatch = async (batch: Omit<Batch, 'id'> & { id?: string }) => {
    const id = batch.id || `batch-${Date.now()}`;
    const newBatch: Batch = { ...batch, id, status: batch.status || 'ACTIVE' };
    setBatches(prev => [...prev.filter(b => b.id !== id), newBatch]);
    try {
      await setDoc(doc(db, 'batches', id), newBatch);
    } catch (e) {
      console.warn("Failed to write batch", e);
    }
  };

  const updateBatch = async (id: string, data: Partial<Batch>) => {
    setBatches(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
    try {
      await updateDoc(doc(db, 'batches', id), data);
    } catch (e) {
      console.warn("Failed to update batch", e);
    }
  };

  const deleteBatch = async (id: string) => {
    setBatches(prev => prev.filter(b => b.id !== id));
    try {
      await deleteDoc(doc(db, 'batches', id));
    } catch (e) {
      console.warn("Failed to delete batch", e);
    }
  };

  const addSemester = async (sem: Omit<Semester, 'id'> & { id?: string }) => {
    const id = sem.id || `sem-${Date.now()}`;
    const newSem: Semester = { ...sem, id, status: sem.status || 'ACTIVE' };
    setSemesters(prev => [...prev.filter(s => s.id !== id), newSem]);
    try {
      await setDoc(doc(db, 'semesters', id), newSem);
    } catch (e) {
      console.warn("Failed to write semester", e);
    }
  };

  const updateSemester = async (id: string, data: Partial<Semester>) => {
    setSemesters(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    try {
      await updateDoc(doc(db, 'semesters', id), data);
    } catch (e) {
      console.warn("Failed to update semester", e);
    }
  };

  const deleteSemester = async (id: string) => {
    setSemesters(prev => prev.filter(s => s.id !== id));
    try {
      await deleteDoc(doc(db, 'semesters', id));
    } catch (e) {
      console.warn("Failed to delete semester", e);
    }
  };

  const addSection = async (sec: Omit<Section, 'id'> & { id?: string }) => {
    const id = sec.id || `sec-${Date.now()}`;
    const newSec: Section = { ...sec, id, status: sec.status || 'ACTIVE' };
    setSections(prev => [...prev.filter(s => s.id !== id), newSec]);
    try {
      await setDoc(doc(db, 'sections', id), newSec);
    } catch (e) {
      console.warn("Failed to write section", e);
    }
  };

  const updateSection = async (id: string, data: Partial<Section>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    try {
      await updateDoc(doc(db, 'sections', id), data);
    } catch (e) {
      console.warn("Failed to update section", e);
    }
  };

  const deleteSection = async (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
    try {
      await deleteDoc(doc(db, 'sections', id));
    } catch (e) {
      console.warn("Failed to delete section", e);
    }
  };

  return (
    <AcademicContext.Provider
      value={{
        departments,
        programs,
        academicYears,
        batches,
        semesters,
        sections,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        addProgram,
        updateProgram,
        deleteProgram,
        addAcademicYear,
        updateAcademicYear,
        deleteAcademicYear,
        addBatch,
        updateBatch,
        deleteBatch,
        addSemester,
        updateSemester,
        deleteSemester,
        addSection,
        updateSection,
        deleteSection
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
};

export const useAcademic = () => {
  const context = useContext(AcademicContext);
  if (!context) {
    throw new Error('useAcademic must be used within an AcademicProvider');
  }
  return context;
};
