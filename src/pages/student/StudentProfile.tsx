import { Student } from '../../types';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { DatePicker } from '../../components/ui/DatePicker';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useAcademic } from '../../context/AcademicContext';
import { User, KeyRound, AlertCircle, CheckCircle2, Trash2, ExternalLink, ImageIcon, Loader2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getFirestore, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { motion } from 'motion/react';
import { getAuth, updatePassword } from 'firebase/auth';
import ConfirmModal from '../../components/ConfirmModal';
import { formatDate } from '../../utils/dateUtils';

const StudentProfile = () => {
  const { user } = useAuth();
  const { id: paramStudentId } = useParams<{ id?: string }>();
  const { students, attendances } = useData();
  const { departments, programs, academicYears, semesters, sections } = useAcademic();
  
  const [dobVerify, setDobVerify] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdError, setPwdError] = useState(false);

  const [datasetImages, setDatasetImages] = useState<any[]>([]);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [isLoadingDataset, setIsLoadingDataset] = useState(true);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Find the student record associated with param id or the logged-in user
  const targetId = paramStudentId || user?.user_id || '';
  const student = students.find(s => 
    s.id === targetId || 
    s.user_id === targetId || 
    (!paramStudentId && Boolean(s.email && user?.email && s.email.toLowerCase() === (user.email || '').toLowerCase()))
  ) || (paramStudentId ? students[0] : students.find(s => s.id === 'S001') || students[0]);
  const studentId = student?.id || user?.user_id || 'S001';
  const studentLogs = attendances.filter(att => att.student_id === studentId).sort((a, b) => new Date(b.date || b.timestamp).getTime() - new Date(a.date || a.timestamp).getTime());

  React.useEffect(() => {
    if (!studentId) return;

    const datasetRef = collection(db, 'students', studentId, 'dataset');
    const q = query(datasetRef);

    const fetchDataset = async () => {
      try {
        const datasetRef = collection(db, 'students', studentId, 'dataset');
        const q = query(datasetRef);
        const snapshot = await getDocs(q);
        const images = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDatasetImages(images);
        setIsLoadingDataset(false);
        setDatasetError(null);
        
        // Auto-fix discrepancy in image count if they view this profile
        const currentStudent = students.find(s => s.id === studentId);
        if (currentStudent && currentStudent.images !== images.length && images.length >= 0) {
          import('firebase/firestore').then(({ doc, updateDoc, getFirestore }) => {
            const dbInstance = getFirestore();
            updateDoc(doc(dbInstance, 'students', studentId), { images: images.length }).catch(console.warn);
          });
        }
      } catch (error: any) {
        console.warn("Error fetching dataset:", error);
        setIsLoadingDataset(false);
        setDatasetImages([]);
        // Since dataset is not strictly necessary to view profile and can fail due to missing rules on new setups, we just ignore it for now.
        setDatasetError("No dataset images available or missing permissions to view them.");
      }
    };

    fetchDataset();
  }, [studentId, students]);

  const { addDatasetImage, deleteDatasetImage } = useData();

  const handleDeleteImage = (imageId: string) => {
    setImageToDelete(imageId);
  };

  const executeDeleteImage = async () => {
    if (imageToDelete) {
      try {
        await deleteDatasetImage(studentId, imageToDelete);
      } catch (error) {
        console.warn('Failed to delete image', error);
      }
      setImageToDelete(null);
    }
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 600;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && studentId) {
      try {
        for (let i = 0; i < files.length; i++) {
          const base64 = await resizeImage(files[i]);
          await addDatasetImage(studentId, base64);
        }
      } catch (error) {
        console.warn('Failed to upload image', error);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  // Group logs by date for day-wise attendance
  const dayWiseAttendance = React.useMemo(() => {
    const grouped: Record<string, { date: string, status: string, periods: number, present: number }> = {};
    studentLogs.forEach(log => {
      if (!grouped[log.date]) {
        grouped[log.date] = { date: log.date, status: 'PRESENT', periods: 0, present: 0 };
      }
      grouped[log.date].periods += 1;
      if (log.status === 'PRESENT') {
        grouped[log.date].present += 1;
      } else if (log.status === 'LATE') {
        grouped[log.date].present += 1;
        if (grouped[log.date].status === 'PRESENT') {
          grouped[log.date].status = 'LATE';
        }
      } else if (log.status === 'ABSENT') {
        grouped[log.date].status = 'ABSENT';
      }
    });
    return Object.values(grouped).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [studentLogs]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg('');
    setPwdError(false);

    if (!student?.dateOfBirth) {
      setPwdError(true);
      setPwdMsg('Date of Birth is not set on your profile. Please contact Admin.');
      return;
    }

    if (dobVerify !== student.dateOfBirth) {
      setPwdError(true);
      setPwdMsg('Date of Birth does not match our records.');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError(true);
      setPwdMsg('Password must be at least 6 characters long.');
      return;
    }

    try {
      const auth = getAuth();
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setPwdError(false);
        setPwdMsg('Password successfully updated.');
        setNewPassword('');
        setDobVerify('');
      } else {
        setPwdError(true);
        setPwdMsg('You must be signed in to change your password.');
      }
    } catch (err: any) {
      console.warn(err);
      setPwdError(true);
      if (err.code === 'auth/requires-recent-login') {
        setPwdMsg('Please sign out and sign in again to change your password.');
      } else {
        setPwdMsg('Failed to update password.');
      }
    }
  };

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
        <p>Student profile not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white dark:text-white">My Profile</h2>
        <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">View your personal information and academic details.</p>
      </div>

      <div className="glass-card dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-500/20 dark:border-slate-800 overflow-hidden">
        <div className="p-8 flex flex-col md:flex-row gap-8 items-start">
          
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-lg">
                {student.profilePic ? (
                  <img 
                    src={student.profilePic} 
                    alt={student.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <User className="w-12 h-12" />
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-[150px]">
              Profile picture is managed by the administrator.
            </p>
          </div>

          {/* Student Details Section */}
          <div className="flex-1 space-y-8 w-full">
            
            {/* Personal Details */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white dark:text-white mb-4 border-b border-slate-500/20 dark:border-slate-700 pb-2">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Full Name</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white font-medium">
                    {student.firstName || student.name} {student.middleName} {student.lastName}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Date of Birth</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.dateOfBirth ? formatDate(student.dateOfBirth) : 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Gender</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.gender || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Blood Group</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.bloodGroup || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Religion</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.religion || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Caste Name</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.casteName || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Caste Category</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.casteCategory || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Details */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white dark:text-white mb-4 border-b border-slate-500/20 dark:border-slate-700 pb-2">Academic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Registration Number</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white font-mono">
                    {student.registrationNumber || student.id}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">USN</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white font-mono">
                    {student.usn || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Mode of Admission</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.modeOfAdmission || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Date of Admission</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.dateOfAdmission ? formatDate(student.dateOfAdmission) : 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Academic Year</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {academicYears.find(y => y.id === student.current_academic_year_id)?.year_name || student.academicYear || student.year || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Program / Department</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {programs.find(p => p.id === student.program_id)?.program_name || departments.find(d => d.id === student.department_id)?.department_name || student.courseAdopted || student.department || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact & Family Details */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white dark:text-white mb-4 border-b border-slate-500/20 dark:border-slate-700 pb-2">Contact & Family Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Email ID</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.email || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Phone Number</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.phone || 'N/A'}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Address</label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-500/20 dark:border-slate-700 text-slate-800 dark:text-white dark:text-white">
                    {student.address || 'N/A'}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-500/20 dark:border-slate-700">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-2 uppercase tracking-wider">Mother's Details</label>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Name:</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-white dark:text-white">{student.motherName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Contact:</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-white dark:text-white">{student.motherContact || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-500/20 dark:border-slate-700">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-2 uppercase tracking-wider">Father's Details</label>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Name:</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-white dark:text-white">{student.fatherName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Contact:</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-white dark:text-white">{student.fatherContact || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* System Info */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-indigo-900 dark:text-indigo-300">Dataset Images</h4>
                      <p className="text-sm text-indigo-700 dark:text-indigo-400">Manage your facial recognition dataset ({student.images} images)</p>
                    </div>
                    <div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                      >
                        Upload Images
                      </button>
                    </div>
                  </div>
                  
                  {isLoadingDataset ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <p>Loading dataset...</p>
                    </div>
                  ) : datasetError ? (
                    <div className="flex flex-col items-center justify-center py-8 text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-xl mt-4 border border-rose-200 dark:border-rose-500/20 px-4 text-center">
                      <p className="font-medium">{datasetError}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                      {datasetImages.map((img, idx) => (
                        <div key={img.id} className="group relative aspect-square rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden border border-slate-500/20 dark:border-slate-600">
                          <img 
                            src={img.url} 
                            alt={`Dataset ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <a href={img.url} target="_blank" rel="noreferrer" className="p-2 glass-card text-slate-800 dark:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button 
                              onClick={() => handleDeleteImage(img.id)}
                              className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {datasetImages.length === 0 && (
                        <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-500/20 dark:border-slate-700/50 rounded-xl">
                          <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm">No images in dataset yet.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-500/20 dark:border-slate-700 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="font-semibold text-slate-800 dark:text-white dark:text-white">Change Password</h4>
                  </div>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    {pwdMsg && (
                      <div className={`p-3 rounded-lg flex items-start gap-2 text-sm ${pwdError ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {pwdError ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
                        <p>{pwdMsg}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Verify Date of Birth</label>
                        <DatePicker
                          
                          required
                          value={dobVerify}
                          onChange={(e) => setDobVerify(e.target.value)}
                          onClick={(e) => { try { (e.target as any).showPicker?.(); } catch (err) {} }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-500/20 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 glass-card dark:bg-slate-800 text-slate-800 dark:text-white dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">New Password</label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-500/20 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 glass-card dark:bg-slate-800 text-slate-800 dark:text-white dark:text-white"
                          placeholder="At least 6 characters"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                      Update Password
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Attendance Section */}
      <div className="glass-card dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-500/20 dark:border-slate-800 overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-500/10 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white dark:text-white">Day-wise Attendance Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm border-b border-slate-500/10 dark:border-slate-800">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Periods Attended</th>
                <th className="px-6 py-4 font-medium">Overall Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dayWiseAttendance.map((day, idx) => (
                <tr key={day.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-800 dark:text-white dark:text-slate-300 font-medium">{day.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{day.present} / {day.periods}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      day.status === 'Present' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                      day.status === 'Late' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                    }`}>
                      {day.status}
                    </span>
                  </td>
                </tr>
              ))}
              {dayWiseAttendance.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400">
                    No day-wise attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-500/20 dark:border-slate-800 overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-500/10 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white dark:text-white">Period-wise Attendance Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm border-b border-slate-500/10 dark:border-slate-800">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Subject / Offering</th>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Method</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {studentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-800 dark:text-white dark:text-slate-300 font-medium">{log.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{log.course_offering_id}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '09:00'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">{log.recognition_method || 'FACE_RECOGNITION'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      log.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                      log.status === 'LATE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
              {studentLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!imageToDelete}
        title="Delete Dataset Image?"
        message="Are you sure you want to delete this image? It will be removed from your facial recognition dataset."
        onConfirm={executeDeleteImage}
        onCancel={() => setImageToDelete(null)}
        confirmText="Delete Image"
      />
    </div>
  );
};

export default StudentProfile;
