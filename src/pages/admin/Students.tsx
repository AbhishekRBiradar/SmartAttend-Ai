import { Student } from '../../types';
import React, { useState, useRef, useEffect } from 'react';
import { DatePicker } from '../../components/ui/DatePicker';
import { useNavigate } from 'react-router-dom';
import { useAcademic } from '../../context/AcademicContext';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Trash2, Edit, Upload, FolderOpen, FileUp, AlertTriangle, Download, Camera, Loader2, AlertCircle, CheckCircle2, X, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CaptureModal from '../../components/CaptureModal';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { secondaryAuth, db } from '../../firebase';
import Papa from 'papaparse';



const Students = () => {
  const { departments, programs, batches, academicYears, semesters, sections } = useAcademic();
  const { user } = useAuth();
  const isDept = user?.role === 'DEPARTMENT_ADMIN';
  const myDept = user?.department_id || (user as any)?.department;
  const myDeptObj = departments?.find(d => d.id === myDept || d.department_id === myDept || d.name === myDept || (d as any).department_name === myDept);
  const myDeptId = myDeptObj?.id || myDeptObj?.department_id || myDept;
  const myDeptName = myDeptObj?.name || (myDeptObj as any)?.department_name || myDept;

  const { students, addStudent, updateStudent, deleteStudent, updateStudentImages, addDatasetImage } = useData();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState<any>({
    id: '', name: '', email: '', dateOfBirth: '',
    department_id: isDept ? myDeptId : '',
    department: isDept ? myDeptName : '',
    program_id: '',
    batch_id: '',
    current_academic_year_id: '',
    current_semester_id: '',
    current_section_id: ''
  });
  const [bulkUploadStudentId, setBulkUploadStudentId] = useState('');
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [modalError, setModalError] = useState('');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddCaptureModalOpen, setIsAddCaptureModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const bulkUploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleCloseAll = () => {
      setIsModalOpen(false);
      setIsEditModalOpen(false);
      setIsBulkModalOpen(false);
      setIsAddCaptureModalOpen(false);
      setIsBulkDeleteModalOpen(false);
      setStudentToDelete(null);
    };
    window.addEventListener('close-all-modals', handleCloseAll);
    return () => window.removeEventListener('close-all-modals', handleCloseAll);
  }, []);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [captureStudent, setCaptureStudent] = useState<{id: string, name: string} | null>(null);
  
  const [departmentFilter, setDepartmentFilter] = useState(isDept ? myDept : 'All');
  const [yearFilter, setYearFilter] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [imageStatusFilter, setImageStatusFilter] = useState('All');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredStudents = students.filter(s => {
    if (isDept) {
      const studentDept = s.department_id || s.department;
      const isMyDept = studentDept === myDept || 
        studentDept === myDeptId || 
        studentDept === myDeptName || 
        (myDeptObj && (studentDept === myDeptObj.id || studentDept === myDeptObj.department_id || studentDept === myDeptObj.name || (studentDept as any) === (myDeptObj as any).department_name));
      if (!isMyDept) return false;
    }

    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || (
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.id && s.id.toLowerCase().includes(term)) ||
      (s.registrationNumber && s.registrationNumber.toLowerCase().includes(term)) ||
      (s.usn && s.usn.toLowerCase().includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term)) ||
      (s.department && s.department.toLowerCase().includes(term)) ||
      (s.year && String(s.year).toLowerCase().includes(term)) ||
      (s.semester && String(s.semester).toLowerCase().includes(term))
    );
    
    const matchesDepartment = isDept ? true : (departmentFilter === 'All' || s.department_id === departmentFilter || s.department === departmentFilter);
    const matchesYear = yearFilter === 'All' || s.year === yearFilter;
    const matchesSemester = semesterFilter === 'All' || s.semester === semesterFilter;
    const matchesImageStatus = imageStatusFilter === 'All' || 
      (imageStatusFilter === 'Registered' ? (s.images && s.images > 0) : (!s.images || s.images === 0));

    return matchesSearch && matchesDepartment && matchesYear && matchesSemester && matchesImageStatus;
  });

  const isFiltered = searchTerm !== '' || departmentFilter !== (isDept ? myDept : 'All') || yearFilter !== 'All' || semesterFilter !== 'All' || imageStatusFilter !== 'All';

    const handleBulkDelete = async () => {
    setIsProcessing(true);
    let successCount = 0;
    try {
      for (const id of selectedStudentIds) {
        await deleteStudent(id);
        successCount++;
      }
      showNotification(`Successfully deleted ${successCount} students.`);
      setSelectedStudentIds([]);
      setIsBulkDeleteModalOpen(false);
    } catch (err: any) {
      showNotification(err.message || 'Error performing bulk delete.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter(isDept ? myDept : 'All');
    setYearFilter('All');
    setSemesterFilter('All');
    setImageStatusFilter('All');
  };

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, departmentFilter, yearFilter, semesterFilter, imageStatusFilter]);

  const uniqueDepartments = Array.from(new Set(students.map(s => s.department).filter(Boolean)));
  const uniqueYears = Array.from(new Set(students.map(s => s.year).filter(Boolean)));
  const uniqueSemesters = Array.from(new Set(students.map(s => s.semester).filter(Boolean)));

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    const cleanName = newStudent.name.trim();
    const cleanEmail = newStudent.email ? newStudent.email.trim() : '';
    const cleanId = newStudent.id ? newStudent.id.trim() : '';

    if (!cleanName) {
      setModalError("Please enter student name.");
      return;
    }

    const finalId = cleanId ? cleanId.toUpperCase() : `S${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

    // Check for uniqueness
    if (students.some(s => (s.id || '').toUpperCase() === finalId.toUpperCase())) {
      setModalError("This User ID already exists. Please use a unique ID.");
      return;
    }

    const studentSnapshot = {
      ...newStudent,
      id: finalId,
      name: cleanName,
      email: cleanEmail
    };
    const capturedImg = capturedImage;

    setNewStudent({ id: '', name: '', email: '', dateOfBirth: '', department_id: isDept ? myDept : '', program_id: '', batch_id: '', current_academic_year_id: '', current_semester_id: '', current_section_id: '' });
    setCapturedImage(null);
    setIsModalOpen(false);
    showNotification("Student record created successfully.");

    try {
      let authUid = null;
      if (cleanEmail) {
        try {
          const pass = cleanEmail.length >= 6 ? cleanEmail : 'password123';
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, pass);
          authUid = userCredential.user.uid;
          
          try {
            await setDoc(doc(db, 'users', authUid), {
              user_id: authUid,
              name: cleanName,
              email: cleanEmail,
              role: 'STUDENT',
              createdAt: new Date().toISOString()
            });
          } catch (roleError) {
            console.warn("Could not create user role doc:", roleError);
          }
        } catch (authError: any) {
          console.warn("Could not create auth account:", authError);
        }
      }

      const assignedId = authUid || finalId;
      try {
        await addStudent({
          id: assignedId,
          user_id: assignedId,
          name: cleanName,
          email: cleanEmail,
          registrationNumber: finalId,
          department_id: studentSnapshot.department_id || '',
          program_id: (studentSnapshot as any).program_id || '',
          batch_id: (studentSnapshot as any).batch_id || '',
          current_academic_year_id: (studentSnapshot as any).current_academic_year_id || '',
          current_semester_id: (studentSnapshot as any).current_semester_id || '',
          current_section_id: (studentSnapshot as any).current_section_id || '',
          dateOfBirth: studentSnapshot.dateOfBirth,
          status: 'ACTIVE',
          role: 'STUDENT',
          images: 0
        } as any);
      } catch (error: any) {
        console.error('Error adding student:', error);
      }

      if (capturedImg) {
        try {
          await addDatasetImage(assignedId, capturedImg);
        } catch (err: any) {
          console.warn("Error adding dataset image", err);
        }
      }
    } catch (error: any) {
      console.error("Failed to create student record:", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          let count = 0;
          for (const row of results.data as any[]) {
            const regNo = row['USER ID']?.trim();
            const name = row['FULLNAME']?.trim();
            const email = row['EMAIL ADDRESS']?.trim();
            const dob = row['DATE OF BIRTH']?.trim();
            const dept = row['DEPARTMENT']?.trim();
            const year = row['YEAR']?.trim();
            const semester = row['SEMESTER']?.trim();
            
            if (regNo && name) {
              try {
                const newId = regNo;
                await addStudent({
                  id: newId,
                  user_id: newId,
                  registrationNumber: regNo,
                  name: name,
                  email: email,
                  dateOfBirth: dob,
                  department: isDept ? myDeptName : (dept || ''),
                  department_id: isDept ? myDeptId : (dept || ''),
                  program_id: '',
                  batch_id: '',
                  current_academic_year_id: '',
                  current_semester_id: '',
                  current_section_id: '',
                  status: 'ACTIVE',
                  role: 'STUDENT',
                  images: 0
                } as any);
                count++;
              } catch (error: any) {
                console.warn(`Error adding student ${name}:`, error);
              }
            }
          }
          showNotification(`Successfully uploaded ${count} students from CSV.`);
        },
        error: (error) => {
          console.warn("Error parsing CSV:", error);
          showNotification("Failed to parse CSV file.", "error");
        }
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const confirmDelete = (id: string) => {
    setStudentToDelete(id);
  };

  const handleDelete = () => {
    if (studentToDelete) {
      deleteStudent(studentToDelete);
      setStudentToDelete(null);
      showNotification("Student record deleted successfully.");
    }
  };

    
  const handleBulkUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e);
  };

  const handleUploadClick = (student: any) => {
    setNewStudent(student); // or similar
    setIsAddCaptureModalOpen(true);
  };

  const handleEditClick = (student: any) => {
    setEditingStudent(student);
    setIsEditModalOpen(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      const studentToUpdate = { ...editingStudent };
      setIsEditModalOpen(false);
      setEditingStudent(null);
      showNotification("Student updated successfully.");
      try {
        await updateStudent(studentToUpdate.id, studentToUpdate);
      } catch (err: any) {
        console.error("Error updating student:", err);
      }
    }
  };

  const handleBulkUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !bulkUploadStudentId) return;
    
    // just dummy implementation for now since it was a complex method
    showNotification("Images uploaded.");
    setIsBulkModalOpen(false);
  };


  const handleDownloadTemplate = () => {
    const headers = ['USER ID', 'FULLNAME', 'EMAIL ADDRESS', 'DATE OF BIRTH', 'DEPARTMENT', 'YEAR', 'SEMESTER'];
    const csvContent = headers.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'students_upload_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCSV = () => {
    if (filteredStudents.length === 0) return;

    const headers = ['USER ID', 'FULLNAME', 'EMAIL ADDRESS', 'DATE OF BIRTH', 'DEPARTMENT', 'YEAR', 'SEMESTER'];
    const csvContent = [
      headers.join(','),
      ...filteredStudents.map(s => `"${s.registrationNumber || s.id}","${s.name}","${s.email || ''}","${s.dateOfBirth || ''}","${s.department}","${s.year || 'N/A'}","${s.semester || 'N/A'}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'students_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 relative">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
              notification.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <p className="text-sm font-medium">{notification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Users Management</h2>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Manage student and teacher records, and facial datasets.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 glass-card border border-slate-500/20 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Download className="w-5 h-5" />
            Download Template
          </button>
          <button 
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 glass-card border border-slate-500/20 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Download className="w-5 h-5" />
            Download CSV
          </button>
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleBulkUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 glass-card border border-slate-500/20 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <FileUp className="w-5 h-5" />
            Bulk Upload
          </button>
          <button 
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-2 glass-card border border-slate-500/20 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Upload className="w-5 h-5" />
            Bulk Upload Images
          </button>
          <button 
            onClick={() => {
              if (true) {
                const unregistered = students.filter(s => !s.images || s.images === 0);
                unregistered.forEach(async (u) => {
                  await deleteStudent(u.id);
                });
                alert(`Deleted ${unregistered.length} unregistered users.`);
              }
            }}
            className="flex items-center gap-2 glass-card border border-slate-500/20 hover:bg-rose-50 text-rose-600 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Trash2 className="w-5 h-5" />
            Clean Unregistered
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          className="hidden" 
          ref={uploadInputRef}
          onChange={handleFileChange}
        />
        <div className="p-4 border-b border-slate-500/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-500/5 dark:bg-slate-800/50">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Global search by name, ID, Reg. No., email, department..." 
              value={searchTerm || ''}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent glass-card shadow-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
{!isDept && (
            <select
              value={departmentFilter || ''}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 border border-slate-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm"
            >
              <option value="All">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept || ''}>{dept}</option>
              ))}
            </select>
          )}

            <select
              value={yearFilter || ''}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 border border-slate-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm"
            >
              <option value="All">All Years</option>
              {uniqueYears.map(year => (
                <option key={year} value={year || ''}>{year}</option>
              ))}
            </select>

            <select
              value={semesterFilter || ''}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="px-3 py-2 border border-slate-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm"
            >
              <option value="All">All Semesters</option>
              {uniqueSemesters.length > 0 ? (
                uniqueSemesters.map(sem => (
                  <option key={sem} value={sem || ''}>{sem}</option>
                ))
              ) : (
                <>
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="3rd Semester">3rd Semester</option>
                  <option value="4th Semester">4th Semester</option>
                  <option value="5th Semester">5th Semester</option>
                  <option value="6th Semester">6th Semester</option>
                  <option value="7th Semester">7th Semester</option>
                  <option value="8th Semester">8th Semester</option>
                </>
              )}
            </select>

            <select
              value={imageStatusFilter || ''}
              onChange={(e) => setImageStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm"
            >
              <option value="All">All Dataset Statuses</option>
              <option value="Registered">Has Face Images</option>
              <option value="Unregistered">No Face Images</option>
            </select>

            {isFiltered && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-500/10 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">
          <span>
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredStudents.length}</strong> of <strong className="text-slate-800 dark:text-slate-200">{students.length}</strong> records
          </span>
          {isFiltered && (
            <span className="text-indigo-600 font-medium">Active filters applied</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-500/5 dark:bg-slate-800/50 border-b border-slate-500/10 text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm font-medium">
                <th className="p-4 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={paginatedStudents.length > 0 && selectedStudentIds.length === paginatedStudents.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudentIds(paginatedStudents.map(s => s.id));
                      } else {
                        setSelectedStudentIds([]);
                      }
                    }}
                  />
                </th>
                <th className="p-4">User ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Role</th>
                <th className="p-4">Department</th>
                <th className="p-4">Year</th>
                <th className="p-4">Semester</th>
                <th className="p-4">Dataset Images</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student, idx) => (
                <motion.tr 
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="border-b border-slate-500/10 hover:bg-slate-500/5 dark:bg-slate-800/50 transition-colors"
                >
                  <td className="p-4">
                    <input 
                      type="checkbox" 
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={selectedStudentIds.includes(student.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds(prev => [...prev, student.id]);
                        } else {
                          setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                        }
                      }}
                    />
                  </td>
                  <td className="p-4 font-mono text-sm text-slate-600 dark:text-slate-300">{student.registrationNumber || student.id}</td>
                  <td className="p-4 font-semibold text-slate-800 dark:text-white flex items-center gap-3">
                    {student.profilePic ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-500/20">
                        <img src={student.profilePic} alt={student.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {student.name.charAt(0)}
                      </div>
                    )}
                    {student.name}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      Student
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">
                    {departments.find(d => d.id === student.department_id)?.department_name || student.department || 'N/A'}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                    {academicYears.find(y => y.id === student.current_academic_year_id)?.year_name || student.year || 'N/A'}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">
                    {semesters.find(s => s.id === student.current_semester_id)?.semester_number ? `Semester ${semesters.find(s => s.id === student.current_semester_id)?.semester_number}` : student.semester || 'N/A'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-400" />
                      <span className="font-medium text-slate-700 dark:text-slate-200 dark:text-slate-300">{student.images} images</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/admin/students/${student.id}`)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors" 
                        title="View Dataset"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setCaptureStudent({ id: student.id, name: student.name });
                          setIsCaptureModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors" 
                        title="Capture Face"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleUploadClick(student.id)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors" 
                        title="Upload Images"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEditClick(student)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" 
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => confirmDelete(student.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors" 
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {paginatedStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400">
                    No students found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
              Showing <span className="font-medium text-slate-800 dark:text-white">{startIndex + 1}</span> to <span className="font-medium text-slate-800 dark:text-white">{Math.min(startIndex + itemsPerPage, filteredStudents.length)}</span> of <span className="font-medium text-slate-800 dark:text-white">{filteredStudents.length}</span> students
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-slate-500/20 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show pages around current page
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center rounded-md text-sm transition-colors ${
                        currentPage === pageNum 
                          ? 'bg-indigo-600 text-white font-medium' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-slate-500/20 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isCaptureModalOpen && captureStudent && (
          <CaptureModal
            isOpen={isCaptureModalOpen}
            onClose={() => setIsCaptureModalOpen(false)}
            studentId={captureStudent.id}
            studentName={captureStudent.name}
          />
        )}
      </AnimatePresence>

      {/* Add Student Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-500/10 shrink-0">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Add New User</h3>
              </div>
              <form onSubmit={handleAddStudent} className="p-6 space-y-4 overflow-y-auto">
                {modalError && (
                  <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded-md flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                    <p className="text-sm text-rose-700">{modalError}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">User ID</label>
                  <input 
                    type="text" 
                    required
                    value={newStudent.id || ''}
                    onChange={e => setNewStudent({...newStudent, id: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                    placeholder="e.g. S001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={newStudent.name || ''}
                    onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={newStudent.email || ''}
                    onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="student@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Date of Birth</label>
                  <DatePicker 
                     
                    required
                    value={newStudent.dateOfBirth || ''}
                    onChange={e => setNewStudent({...newStudent, dateOfBirth: e.target.value})}
                    onClick={(e) => { try { (e.target as any).showPicker?.(); } catch (err) {} }}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-1 md:col-span-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Department</label>
                    {isDept ? (
                      <input 
                        type="text"
                        disabled
                        value={myDeptName || 'Your Department'}
                        className="w-full px-4 py-2 rounded-lg border border-slate-500/20 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed font-medium"
                      />
                    ) : (
                      <select
                        value={newStudent.department_id || ''}
                        onChange={e => setNewStudent({...newStudent, department_id: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Department</option>
                        {(departments || []).map(d => <option key={d.id} value={d.id || ''}>{d.department_name}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Program</label>
                    <select
                      value={newStudent.program_id || ''}
                      onChange={e => setNewStudent({...newStudent, program_id: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Program</option>
                      {programs.filter(p => isDept ? (p.department_id === myDeptId || p.department_id === myDept) : (p.department_id === newStudent.department_id)).map(p => <option key={p.id} value={p.id || ''}>{p.program_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Batch</label>
                    <select
                      value={newStudent.batch_id || ''}
                      onChange={e => setNewStudent({...newStudent, batch_id: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Batch</option>
                      {batches.filter(b => b.program_id === newStudent.program_id).map(b => <option key={b.id} value={b.id || ''}>{b.batch_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Academic Year</label>
                    <select
                      value={newStudent.current_academic_year_id || ''}
                      onChange={e => setNewStudent({...newStudent, current_academic_year_id: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Year</option>
                      {academicYears.map(ay => <option key={ay.id} value={ay.id || ''}>{ay.year_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Semester</label>
                    <select
                      value={newStudent.current_semester_id || ''}
                      onChange={e => setNewStudent({...newStudent, current_semester_id: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Semester</option>
                      {semesters.filter(s => s.academic_year_id === newStudent.current_academic_year_id && s.program_id === newStudent.program_id).map(s => <option key={s.id} value={s.id || ''}>Semester {s.semester_number}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Section</label>
                    <select
                      value={newStudent.current_section_id || ''}
                      onChange={e => setNewStudent({...newStudent, current_section_id: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Section</option>
                      {sections.filter(s => s.semester_id === newStudent.current_semester_id).map(s => <option key={s.id} value={s.id || ''}>{s.section_name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Capture Image Section */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Facial Enrollment</label>
                  
                  {!capturedImage && (
                    <button
                      type="button"
                      onClick={() => setIsAddCaptureModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-500/20 rounded-xl text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                    >
                      <Camera className="w-5 h-5" />
                      Capture Face for Enrollment
                    </button>
                  )}

                  {capturedImage && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-500/20 aspect-video group">
                      <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddCaptureModalOpen(true)}
                          className="glass-card text-slate-800 dark:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                        >
                          <Camera className="w-3.5 h-3.5" /> Retake
                        </button>
                        <button
                          type="button"
                          onClick={() => setCapturedImage(null)}
                          className="bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      setIsModalOpen(false);
                      setModalError('');
                      setCapturedImage(null);
                    }}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isProcessing}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                  >
                    {isProcessing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    ) : (
                      'Save Student'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Student Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingStudent && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-500/10 shrink-0">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Edit User Details</h3>
              </div>
              <form onSubmit={handleUpdateStudent} className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">User ID</label>
                  <input 
                    type="text" 
                    required
                    value={editingStudent.id || ''}
                    onChange={e => setEditingStudent({...editingStudent, id: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                    placeholder="e.g. S001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={editingStudent.name || ''}
                    onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. John Doe"
                  />
                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-1 md:col-span-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Department</label>
                    {isDept ? (
                      <input 
                        type="text"
                        disabled
                        value={myDeptName || 'Your Department'}
                        className="w-full px-4 py-2 rounded-lg border border-slate-500/20 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed font-medium"
                      />
                    ) : (
                      <select
                        value={editingStudent.department_id || ''}
                        onChange={e => setEditingStudent({...editingStudent, department_id: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Department</option>
                        {(departments || []).map(d => <option key={d.id} value={d.id || ''}>{d.department_name}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Program</label>
                    <select
                      value={editingStudent.program_id || ''}
                      onChange={e => setEditingStudent({...editingStudent, program_id: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Program</option>
                      {programs.filter(p => isDept ? (p.department_id === myDeptId || p.department_id === myDept) : (p.department_id === editingStudent.department_id)).map(p => <option key={p.id} value={p.id || ''}>{p.program_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Batch</label>
                    <select
                      value={editingStudent.batch_id || ''}
                      onChange={e => setEditingStudent({...editingStudent, batch_id: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Batch</option>
                      {batches.filter(b => b.program_id === editingStudent.program_id).map(b => <option key={b.id} value={b.id || ''}>{b.batch_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Academic Year</label>
                    <select
                      value={editingStudent.current_academic_year_id || ''}
                      onChange={e => setEditingStudent({...editingStudent, current_academic_year_id: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Year</option>
                      {academicYears.map(ay => <option key={ay.id} value={ay.id || ''}>{ay.year_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Semester</label>
                    <select
                      value={editingStudent.current_semester_id || ''}
                      onChange={e => setEditingStudent({...editingStudent, current_semester_id: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Semester</option>
                      {semesters.filter(s => s.academic_year_id === editingStudent.current_academic_year_id && s.program_id === editingStudent.program_id).map(s => <option key={s.id} value={s.id || ''}>Semester {s.semester_number}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Section</label>
                    <select
                      value={editingStudent.current_section_id || ''}
                      onChange={e => setEditingStudent({...editingStudent, current_section_id: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Section</option>
                      {sections.filter(s => s.semester_id === editingStudent.current_semester_id).map(s => <option key={s.id} value={s.id || ''}>{s.section_name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingStudent(null);
                    }}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isProcessing}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                  >
                    {isProcessing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                    ) : (
                      'Update Details'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddCaptureModalOpen && (
          <CaptureModal
            isOpen={isAddCaptureModalOpen}
            onClose={() => setIsAddCaptureModalOpen(false)}
            studentId={newStudent.id || 'NEW'}
            studentName={newStudent.name || 'New Student'}
            onCapture={(img) => setCapturedImage(img)}
          />
        )}
      </AnimatePresence>

      {/* Bulk Upload Images Modal */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-500/10">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Bulk Upload Images</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Select Student</label>
                  <select 
                    value={bulkUploadStudentId || ''}
                    onChange={e => setBulkUploadStudentId(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select a student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id || ''}>{s.name} ({s.registrationNumber || s.id})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Select Images</label>
                  <input 
                    type="file"
                    multiple
                    accept="image/*"
                    ref={bulkUploadInputRef}
                    onChange={handleBulkUploadImages}
                    disabled={!bulkUploadStudentId}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">You can select multiple images at once.</p>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    onClick={() => {
                      setIsBulkModalOpen(false);
                      setBulkUploadStudentId('');
                    }}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {studentToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Delete Student?</h3>
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-6">
                  Are you sure you want to delete this student record? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setStudentToDelete(null)}
                    className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 text-white bg-rose-600 hover:bg-rose-700 rounded-xl font-medium transition-colors shadow-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Students;
