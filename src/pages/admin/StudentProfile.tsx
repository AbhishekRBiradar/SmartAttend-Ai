import { Student } from '../../types';
import React, { useState, useEffect, useRef } from 'react';
import { DatePicker } from '../../components/ui/DatePicker';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  User, 
  BookOpen, 
  Calendar, 
  IdCard, 
  Image as ImageIcon, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Upload,
  X,
  CheckCircle2,
  Camera,
  Edit
} from 'lucide-react';
import { useData, DatasetImage } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';
import { collection, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import CaptureModal from '../../components/CaptureModal';
import StudentEnrollment from '../../components/StudentEnrollment';
import ConfirmModal from '../../components/ConfirmModal';
import { formatDate } from '../../utils/dateUtils';



const StudentProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { students, attendances, addDatasetImage, deleteDatasetImage } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const student = students.find(s => s.id === id);
  const studentLogs = attendances.filter(att => att.student_id === id);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'dataset' | 'edit' | 'enrollments'>('overview');
  const [datasetImages, setDatasetImages] = useState<DatasetImage[]>([]);
  const [isLoadingDataset, setIsLoadingDataset] = useState(true);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isUploadingProfilePic, setIsUploadingProfilePic] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Student>>({});
  const [isSaving, setIsSaving] = useState(false);
  const profilePicInputRef = useRef<HTMLInputElement>(null);
  const { updateStudent } = useData();

  useEffect(() => {
    if (student) {
      setEditFormData(student);
    }
  }, [student]);

  useEffect(() => {
    if (!id) return;

    const datasetRef = collection(db, 'students', id, 'dataset');
    const q = query(datasetRef);

    const fetchDataset = async () => {
      try {
        const datasetRef = collection(db, 'students', id, 'dataset');
        const q = query(datasetRef);
        const snapshot = await getDocs(q);
        const images = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as DatasetImage));
        setDatasetImages(images);
        setIsLoadingDataset(false);
        setDatasetError(null);
        
        // Auto-fix discrepancy in image count if they view this profile
        const currentStudent = students.find(s => s.id === id);
        if (currentStudent && currentStudent.images !== images.length && images.length >= 0) {
          import('firebase/firestore').then(({ doc, updateDoc, getFirestore }) => {
            const db = getFirestore();
            updateDoc(doc(db, 'students', id), { images: images.length }).catch(console.warn);
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
  }, [id, students]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
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
    if (files && files.length > 0 && id) {
      setIsUploading(true);
      try {
        for (let i = 0; i < files.length; i++) {
          const base64 = await resizeImage(files[i]);
          await addDatasetImage(id, base64);
        }
        showNotification(`Successfully uploaded ${files.length} images`);
      } catch (error) {
        showNotification('Failed to upload images', 'error');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleCaptureImage = async (base64Image: string) => {
    if (id) {
      setIsUploading(true);
      try {
        await addDatasetImage(id, base64Image);
        showNotification('Successfully captured and uploaded image');
      } catch (error) {
        showNotification('Failed to upload image', 'error');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && id) {
      setIsUploadingProfilePic(true);
      try {
        const reader = new FileReader();
        const promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800;
              const MAX_HEIGHT = 800;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = reader.result as string;
          };
          reader.readAsDataURL(file);
        });
        const base64 = await promise;
        await updateStudent(id, { 
          profilePic: base64,
          id: student.id,
          name: student.name || 'Unknown',
          department: student.department || 'Computer Science',
          year: student.year || '1st Year'
        });
        showNotification('Profile picture updated successfully');
      } catch (error) {
        showNotification('Failed to update profile picture', 'error');
      } finally {
        setIsUploadingProfilePic(false);
        if (profilePicInputRef.current) profilePicInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = (imageId: string) => {
    setImageToDelete(imageId);
  };

  const executeDeleteImage = async () => {
    if (imageToDelete) {
      try {
        await deleteDatasetImage(id!, imageToDelete);
        showNotification('Image deleted successfully');
      } catch (error) {
        showNotification('Failed to delete image', 'error');
      }
      setImageToDelete(null);
    }
  };

  const { user } = useAuth();
  const { departments, programs, batches, academicYears, semesters, sections } = useAcademic();
  const isDept = user?.role === 'DEPARTMENT_ADMIN';
  const myDept = user?.department_id || (user as any)?.department;
  const myDeptObj = departments?.find(d => d.id === myDept || d.department_id === myDept || d.name === myDept || (d as any).department_name === myDept);
  const myDeptId = myDeptObj?.id || myDeptObj?.department_id || myDept;
  const myDeptName = myDeptObj?.name || (myDeptObj as any)?.department_name || myDept;

  const isStudentInDepartment = !isDept || (
    student && (
      student.department_id === myDept ||
      student.department === myDept ||
      student.department_id === myDeptId ||
      student.department === myDeptName ||
      (myDeptObj && (student.department === myDeptObj.name || student.department_id === myDeptObj.id || (student as any).department_name === myDeptObj.name))
    )
  );

  if (!student || !isStudentInDepartment) {
    return (
      <div className="p-8 text-center glass-card rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg mx-auto mt-12">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          {!student ? 'Student Not Found' : 'Access Restricted'}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {!student 
            ? `The student with ID ${id} does not exist in our records.`
            : 'Department Administrators are only authorized to view and manage students belonging to their own department.'}
        </p>
        <button 
          onClick={() => navigate('/admin/students')}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-md shadow-indigo-500/20"
        >
          Back to Students
        </button>
      </div>
    );
  }

  // Calculate stats
  const totalClasses = studentLogs.length;
  const presentClasses = studentLogs.filter(l => l.status === 'PRESENT' || l.status === 'LATE').length;
  const attendancePercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

  return (
    <div className="space-y-6 relative">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
              notification.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
            <p className="text-sm font-medium">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="p-1 hover:bg-black/5 rounded-lg"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
      <input type="file" accept="image/*" className="hidden" ref={profilePicInputRef} onChange={handleProfilePicChange} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/students')}
            className="p-2 glass-card dark:bg-slate-800 rounded-xl border border-slate-500/20 dark:border-slate-700 text-slate-600 dark:text-slate-300 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white dark:text-white">{student.name}</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Student Profile & Analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            attendancePercentage >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {attendancePercentage}% Attendance
          </span>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'edit'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'glass-card border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
            }`}
          >
            <Edit className="w-3.5 h-3.5" />
            Edit Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden"
          >
            <div className="h-32 bg-indigo-600 relative">
              <div className="absolute -bottom-12 left-6 group">
                <div className="w-24 h-24 rounded-2xl glass-card dark:bg-slate-700 p-1 shadow-lg relative overflow-hidden">
                  {student.profilePic ? (
                    <img src={student.profilePic} alt={student.name} className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-slate-100 dark:bg-slate-600 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <User className="w-12 h-12" />
                    </div>
                  )}
                  <button 
                    onClick={() => profilePicInputRef.current?.click()}
                    disabled={isUploadingProfilePic}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                  >
                    {isUploadingProfilePic ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-white" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="pt-16 p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">{student.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{student.department}</p>
                </div>
                <button 
                  onClick={() => setActiveTab('edit')}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                  title="Edit details"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm">
                  <IdCard className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-300 font-mono">{student.registrationNumber || student.id}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-300">{student.department}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-300">{student.year || student.academicYear || '1st Year'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-300">{student.images || 0} Dataset Images</span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('edit')}
                className="w-full mt-2 py-2 px-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-indigo-100 dark:border-indigo-800/50"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Student Profile
              </button>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Total Logs</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white dark:text-white">{totalClasses}</p>
            </div>
            <div className="glass-card dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Status</p>
              <p className="text-lg font-bold text-emerald-600">Active</p>
            </div>
          </div>
        </div>

        {/* Right Column - Tabs Content */}
        <div className="lg:col-span-2">
          <div className="glass-card dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full min-h-[600px]">
            {/* Tab Navigation */}
            <div className="flex border-b border-slate-500/10 dark:border-slate-700 p-2 gap-2">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === 'overview' 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700'
                }`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('attendance')}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === 'attendance' 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700'
                }`}
              >
                Attendance History
              </button>
              <button 
                onClick={() => setActiveTab('enrollments')}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'enrollments' 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Enrollments
              </button>
                <button 
                  onClick={() => setActiveTab('dataset')}
                  className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors relative ${
                  activeTab === 'dataset' 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700'
                }`}
              >
                Face Dataset
              </button>
              <button 
                onClick={() => setActiveTab('edit')}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === 'edit' 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700'
                }`}
              >
                Edit Profile
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 flex-1">
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-800 dark:text-white dark:text-white flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        Attendance Summary
                      </h4>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-900/50 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-300 dark:text-slate-400">Present</span>
                          <span className="font-bold text-slate-800 dark:text-white dark:text-white">{studentLogs.filter(l => l.status === 'PRESENT').length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-300 dark:text-slate-400">Late</span>
                          <span className="font-bold text-slate-800 dark:text-white dark:text-white">{studentLogs.filter(l => l.status === 'LATE').length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-300 dark:text-slate-400">Absent</span>
                          <span className="font-bold text-slate-800 dark:text-white dark:text-white">{studentLogs.filter(l => l.status === 'ABSENT').length}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-500/20 dark:border-slate-700 flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-800 dark:text-white dark:text-white">Total Classes</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{totalClasses}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-800 dark:text-white dark:text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        Recent Activity
                      </h4>
                      <div className="space-y-3">
                        {studentLogs.slice(0, 3).map((log, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 glass-card dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm">
                            <div className={`w-2 h-2 mt-1.5 rounded-full ${
                              log.status === 'PRESENT' ? 'bg-emerald-500' : log.status === 'LATE' ? 'bg-amber-500' : 'bg-rose-500'
                            }`} />
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-white dark:text-white">{log.course_offering_id || 'Class'}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{log.date} • {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '09:00'}</p>
                            </div>
                          </div>
                        ))}
                        {studentLogs.length === 0 && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 italic">No recent activity found.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-indigo-600 rounded-2xl text-white relative overflow-hidden">
                    <div className="relative z-10">
                      <h4 className="text-lg font-bold mb-2">AI Recognition Status</h4>
                      <p className="text-indigo-100 text-sm mb-4 max-w-md">
                        The facial recognition model is currently {student.images >= 15 ? 'highly accurate' : 'improving'} for this student based on {student.images} dataset images.
                      </p>
                      <button 
                        onClick={() => setActiveTab('dataset')}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-colors"
                      >
                        Manage Dataset
                      </button>
                    </div>
                    <ImageIcon className="absolute -right-4 -bottom-4 w-32 h-32 text-indigo-500/30" />
                  </div>
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-500/10 dark:border-slate-700">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Subject / Offering</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {studentLogs.map((log) => (
                        <tr key={log.id} className="text-sm hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="px-4 py-4 text-slate-600 dark:text-slate-300 dark:text-slate-300">{log.date}</td>
                          <td className="px-4 py-4 font-medium text-slate-800 dark:text-white dark:text-white">{log.course_offering_id}</td>
                          <td className="px-4 py-4 text-slate-500 dark:text-slate-400 dark:text-slate-400">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '09:00'}</td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              log.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' : 
                              log.status === 'LATE' ? 'bg-amber-100 text-amber-700' : 
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {studentLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400 italic">
                            No attendance records found for this student.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'dataset' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white dark:text-white">Image Dataset</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Images used for AI facial recognition training</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsCaptureModalOpen(true)}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        Capture from Webcam
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {isUploading ? 'Uploading...' : 'Upload Images'}
                      </button>
                    </div>
                  </div>

                  {isLoadingDataset ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <p>Loading dataset...</p>
                    </div>
                  ) : datasetError ? (
                    <div className="flex flex-col items-center justify-center py-12 text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-200 dark:border-rose-500/20 px-4 text-center">
                      <p className="font-medium">{datasetError}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {datasetImages.map((img, idx) => (
                        <div key={img.id} className="group relative aspect-square rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden border border-slate-500/20 dark:border-slate-600">
                          <img 
                            src={img.url} 
                            alt={`Dataset ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            referrerPolicy="no-referrer"
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
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-500/20 dark:border-slate-700 rounded-2xl">
                          <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 dark:text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">No images in dataset yet.</p>
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-4 text-indigo-600 dark:text-indigo-400 font-bold text-sm"
                          >
                            Upload first image
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'enrollments' && student && <StudentEnrollment student={student} />}
              {activeTab === 'edit' && (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setIsSaving(true);
                    try {
                      const selDept = departments?.find(d => d.id === editFormData.department_id || d.department_id === editFormData.department_id || d.name === editFormData.department || (d as any).department_name === editFormData.department);
                      const deptName = isDept ? (myDeptName || 'Department') : (selDept?.department_name || selDept?.name || editFormData.department || student.department || 'Computer Science');
                      const deptId = isDept ? (myDeptId || '') : (editFormData.department_id || selDept?.id || student.department_id || '');

                      const selProg = programs?.find(p => p.id === editFormData.program_id);
                      const selBatch = batches?.find(b => b.id === editFormData.batch_id);
                      const selYear = academicYears?.find(ay => ay.id === editFormData.current_academic_year_id);
                      const selSem = semesters?.find(s => s.id === editFormData.current_semester_id);
                      const selSec = sections?.find(s => s.id === editFormData.current_section_id);

                      // Ensure required fields are present to satisfy Firestore rules
                      const updateData = {
                        ...editFormData,
                        id: student.id,
                        name: editFormData.name || student.name || 'Unknown',
                        department: deptName,
                        department_id: deptId,
                        program_id: editFormData.program_id || student.program_id || '',
                        program: selProg?.program_name || selProg?.name || editFormData.program || (student as any).program || '',
                        batch_id: editFormData.batch_id || student.batch_id || '',
                        batch: selBatch?.batch_name || selBatch?.name || editFormData.batch || (student as any).batch || '',
                        current_academic_year_id: editFormData.current_academic_year_id || (student as any).current_academic_year_id || '',
                        academicYear: selYear?.year_name || selYear?.name || editFormData.academicYear || (student as any).academicYear || '',
                        current_semester_id: editFormData.current_semester_id || (student as any).current_semester_id || '',
                        semester: selSem ? `Semester ${selSem.semester_number}` : (editFormData.semester || student.semester || ''),
                        current_section_id: editFormData.current_section_id || (student as any).current_section_id || '',
                        section: selSec?.section_name || selSec?.name || editFormData.section || (student as any).section || '',
                        year: editFormData.year || student.year || '1st Year',
                        status: editFormData.status || student.status || 'ACTIVE'
                      };
                      await updateStudent(student.id, updateData);
                      showNotification('Student profile updated successfully');
                    } catch (error) {
                      showNotification('Failed to update profile', 'error');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between border-b border-slate-500/10 dark:border-slate-700 pb-4">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white">Edit Student Details</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {isDept ? `Managing student profile under ${myDeptName || 'your department'}` : 'Update personal, academic, and contact information'}
                      </p>
                    </div>
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {isSaving ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Personal Details */}
                    <div className="col-span-full">
                      <h5 className="text-sm font-bold text-slate-800 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-500" />
                        Personal Details
                      </h5>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">First Name</label>
                      <input 
                        type="text" 
                        value={editFormData.firstName || ''}
                        onChange={e => setEditFormData({...editFormData, firstName: e.target.value, name: `${e.target.value} ${editFormData.lastName || ''}`.trim()})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Middle Name</label>
                      <input 
                        type="text" 
                        value={editFormData.middleName || ''}
                        onChange={e => setEditFormData({...editFormData, middleName: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Last Name</label>
                      <input 
                        type="text" 
                        value={editFormData.lastName || ''}
                        onChange={e => setEditFormData({...editFormData, lastName: e.target.value, name: `${editFormData.firstName || ''} ${e.target.value}`.trim()})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date of Birth</label>
                      <DatePicker 
                        value={editFormData.dateOfBirth || ''}
                        onChange={e => setEditFormData({...editFormData, dateOfBirth: e.target.value})}
                        onClick={(e) => { try { (e.target as any).showPicker?.(); } catch (err) {} }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Gender</label>
                      <select 
                        value={editFormData.gender || ''}
                        onChange={e => setEditFormData({...editFormData, gender: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Blood Group</label>
                      <input 
                        type="text" 
                        value={editFormData.bloodGroup || ''}
                        onChange={e => setEditFormData({...editFormData, bloodGroup: e.target.value})}
                        placeholder="e.g. O+, A+, B+"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Religion</label>
                      <input 
                        type="text" 
                        value={editFormData.religion || ''}
                        onChange={e => setEditFormData({...editFormData, religion: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Caste Name</label>
                      <input 
                        type="text" 
                        value={editFormData.casteName || ''}
                        onChange={e => setEditFormData({...editFormData, casteName: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Caste Category</label>
                      <input 
                        type="text" 
                        value={editFormData.casteCategory || ''}
                        onChange={e => setEditFormData({...editFormData, casteCategory: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>

                    {/* Academic Details */}
                    <div className="col-span-full mt-4">
                      <h5 className="text-sm font-bold text-slate-800 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        Academic Hierarchy & Enrollment Details
                      </h5>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Department</label>
                      {isDept ? (
                        <div className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-medium text-sm flex items-center justify-between">
                          <span>{myDeptName || 'Your Department'}</span>
                          <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold">Your Dept</span>
                        </div>
                      ) : (
                        <select
                          value={editFormData.department_id || ''}
                          onChange={e => setEditFormData({...editFormData, department_id: e.target.value})}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                          <option value="">Select Department</option>
                          {(departments || []).map(d => <option key={d.id} value={d.id || ''}>{d.department_name || d.name}</option>)}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Program</label>
                      <select
                        value={editFormData.program_id || ''}
                        onChange={e => setEditFormData({...editFormData, program_id: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      >
                        <option value="">Select Program</option>
                        {programs
                          .filter(p => isDept ? (p.department_id === myDeptId || p.department_id === myDept) : (!editFormData.department_id || p.department_id === editFormData.department_id))
                          .map(p => <option key={p.id} value={p.id || ''}>{p.program_name || p.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Batch</label>
                      <select
                        value={editFormData.batch_id || ''}
                        onChange={e => setEditFormData({...editFormData, batch_id: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      >
                        <option value="">Select Batch</option>
                        {batches
                          .filter(b => !editFormData.program_id || b.program_id === editFormData.program_id)
                          .map(b => <option key={b.id} value={b.id || ''}>{b.batch_name || b.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Academic Year</label>
                      <select
                        value={editFormData.current_academic_year_id || ''}
                        onChange={e => setEditFormData({...editFormData, current_academic_year_id: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      >
                        <option value="">Select Academic Year</option>
                        {academicYears.map(ay => <option key={ay.id} value={ay.id || ''}>{ay.year_name || ay.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Semester</label>
                      <select
                        value={editFormData.current_semester_id || ''}
                        onChange={e => setEditFormData({...editFormData, current_semester_id: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      >
                        <option value="">Select Semester</option>
                        {semesters
                          .filter(s => (!editFormData.current_academic_year_id || s.academic_year_id === editFormData.current_academic_year_id) && (!editFormData.program_id || s.program_id === editFormData.program_id))
                          .map(s => <option key={s.id} value={s.id || ''}>{s.semester_name || `Semester ${s.semester_number}`}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Section</label>
                      <select
                        value={editFormData.current_section_id || ''}
                        onChange={e => setEditFormData({...editFormData, current_section_id: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      >
                        <option value="">Select Section</option>
                        {sections
                          .filter(s => !editFormData.current_semester_id || s.semester_id === editFormData.current_semester_id)
                          .map(s => <option key={s.id} value={s.id || ''}>{s.section_name || s.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Registration Number</label>
                      <input 
                        type="text" 
                        value={editFormData.registrationNumber || ''}
                        onChange={e => setEditFormData({...editFormData, registrationNumber: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">USN</label>
                      <input 
                        type="text" 
                        value={editFormData.usn || ''}
                        onChange={e => setEditFormData({...editFormData, usn: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Student Status</label>
                      <select 
                        value={editFormData.status || 'ACTIVE'}
                        onChange={e => setEditFormData({...editFormData, status: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Mode of Admission</label>
                      <select 
                        value={editFormData.modeOfAdmission || ''}
                        onChange={e => setEditFormData({...editFormData, modeOfAdmission: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      >
                        <option value="">Select Mode</option>
                        <option value="Government">Government (KEA/CET)</option>
                        <option value="Management">Management / Direct</option>
                        <option value="COMEDK">COMEDK</option>
                        <option value="Lateral Entry">Lateral Entry</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date of Admission</label>
                      <DatePicker 
                        value={editFormData.dateOfAdmission || ''}
                        onChange={e => setEditFormData({...editFormData, dateOfAdmission: e.target.value})}
                        onClick={(e) => { try { (e.target as any).showPicker?.(); } catch (err) {} }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Year Tag</label>
                      <input 
                        type="text" 
                        value={editFormData.year || ''}
                        onChange={e => setEditFormData({...editFormData, year: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder="e.g. 1st Year, 2nd Year"
                      />
                    </div>

                    {/* Contact & Family Details */}
                    <div className="col-span-full mt-4">
                      <h5 className="text-sm font-bold text-slate-800 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                        <IdCard className="w-4 h-4 text-indigo-500" />
                        Contact & Family Details
                      </h5>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email ID</label>
                      <input 
                        type="email" 
                        value={editFormData.email || ''}
                        onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Phone Number</label>
                      <input 
                        type="tel" 
                        value={editFormData.phone || ''}
                        onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div className="col-span-full">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Residential Address</label>
                      <textarea 
                        value={editFormData.address || ''}
                        onChange={e => setEditFormData({...editFormData, address: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Mother's Name</label>
                      <input 
                        type="text" 
                        value={editFormData.motherName || ''}
                        onChange={e => setEditFormData({...editFormData, motherName: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Mother's Contact</label>
                      <input 
                        type="tel" 
                        value={editFormData.motherContact || ''}
                        onChange={e => setEditFormData({...editFormData, motherContact: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div className="hidden lg:block"></div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Father's Name</label>
                      <input 
                        type="text" 
                        value={editFormData.fatherName || ''}
                        onChange={e => setEditFormData({...editFormData, fatherName: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Father's Contact</label>
                      <input 
                        type="tel" 
                        value={editFormData.fatherContact || ''}
                        onChange={e => setEditFormData({...editFormData, fatherContact: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 glass-card dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <CaptureModal 
        isOpen={isCaptureModalOpen}
        onClose={() => setIsCaptureModalOpen(false)}
        studentId={id!}
        studentName={student.name}
        onCapture={handleCaptureImage}
      />
      <ConfirmModal
        isOpen={!!imageToDelete}
        title="Delete Dataset Image?"
        message="Are you sure you want to delete this image? It will be removed from the facial recognition dataset."
        onConfirm={executeDeleteImage}
        onCancel={() => setImageToDelete(null)}
        confirmText="Delete Image"
      />
    </div>
  );
};

export default StudentProfile;
