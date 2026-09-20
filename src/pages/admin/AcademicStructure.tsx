import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, GraduationCap, Calendar, Layers, Hash, Plus, Trash2, Edit, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAcademic } from '../../context/AcademicContext';
import { useAuth } from '../../context/AuthContext';

const AcademicStructure = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDept = user?.role === 'DEPARTMENT_ADMIN';
  const myDept = user?.department_id || (user as any)?.department;

  const {
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
  } = useAcademic();

  const tabParam = (searchParams.get('tab') || '').toUpperCase();
  const validTabs = ['DEPARTMENTS', 'PROGRAMS', 'YEARS', 'BATCHES', 'SEMESTERS', 'SECTIONS'] as const;
  type TabType = typeof validTabs[number];

  const initialTab: TabType = validTabs.includes(tabParam as TabType) ? (tabParam as TabType) : 'DEPARTMENTS';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  // Add modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    admin_email: '',
    degree_type: 'B.Tech',
    department_id: '',
    duration_years: 4,
    total_semesters: 8,
    start_year: new Date().getFullYear(),
    end_year: new Date().getFullYear() + 4,
    semester_number: 1,
    max_capacity: 60,
    is_current: false,
    status: 'ACTIVE'
  });

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ type: TabType; id: string } | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam as TabType)) {
      setActiveTab(tabParam as TabType);
    }
  }, [tabParam]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab: tab.toLowerCase() });
  };

  const myDeptObj = departments.find(d => d.id === myDept || d.department_id === myDept || d.name === myDept || (d as any).department_name === myDept);
  const targetDeptId = myDeptObj?.id || myDept || departments[0]?.id || 'dept-cse';

  // Filter lists for department admin
  const visibleDepartments = isDept
    ? departments.filter(d => d.id === myDept || d.department_id === myDept || d.name === myDept || (d as any).department_name === myDept)
    : departments;

  const visiblePrograms = isDept
    ? programs.filter(p => p.department_id === targetDeptId || p.department_id === myDept || !p.department_id)
    : programs;

  const visibleBatches = isDept
    ? batches.filter(b => b.department_id === targetDeptId || b.department_id === myDept || !b.department_id)
    : batches;

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      admin_email: '',
      degree_type: 'B.Tech',
      department_id: isDept ? targetDeptId : (departments[0]?.id || ''),
      duration_years: 4,
      total_semesters: 8,
      start_year: new Date().getFullYear(),
      end_year: new Date().getFullYear() + 4,
      semester_number: semesters.length + 1,
      max_capacity: 60,
      is_current: academicYears.length === 0,
      status: 'ACTIVE'
    });
    setModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      if (activeTab === 'DEPARTMENTS') {
        if (isDept) {
          alert('Department Administrators are not permitted to create or modify other departments.');
          return;
        }
        if (!formData.admin_email.trim()) {
          alert('Department Admin Email is required.');
          setIsSaving(false);
          return;
        }
        await addDepartment({
          name: formData.name.trim(),
          department_name: formData.name.trim(),
          code: formData.code.trim() || 'DEPT',
          department_code: formData.code.trim() || 'DEPT',
          description: formData.description.trim(),
          admin_email: formData.admin_email.trim().toLowerCase(),
          email: formData.admin_email.trim().toLowerCase(),
          status: formData.status
        });
      } else if (activeTab === 'PROGRAMS') {
        await addProgram({
          name: formData.name.trim(),
          program_name: formData.name.trim(),
          code: formData.code.trim() || 'PROG',
          program_code: formData.code.trim() || 'PROG',
          department_id: isDept ? targetDeptId : (formData.department_id || departments[0]?.id || 'dept-cse'),
          degree_type: formData.degree_type || 'B.Tech',
          duration_years: Number(formData.duration_years) || 4,
          total_semesters: Number(formData.total_semesters) || 8,
          status: formData.status
        });
      } else if (activeTab === 'YEARS') {
        await addAcademicYear({
          name: formData.name.trim(),
          year_name: formData.name.trim(),
          is_current: Boolean(formData.is_current),
          status: formData.status
        });
      } else if (activeTab === 'BATCHES') {
        await addBatch({
          name: formData.name.trim(),
          batch_name: formData.name.trim(),
          start_year: Number(formData.start_year) || new Date().getFullYear(),
          end_year: Number(formData.end_year) || new Date().getFullYear() + 4,
          department_id: isDept ? targetDeptId : formData.department_id,
          status: formData.status
        });
      } else if (activeTab === 'SEMESTERS') {
        await addSemester({
          name: formData.name.trim(),
          semester_name: formData.name.trim(),
          semester_number: Number(formData.semester_number) || semesters.length + 1,
          status: formData.status
        });
      } else if (activeTab === 'SECTIONS') {
        await addSection({
          name: formData.name.trim(),
          section_name: formData.name.trim(),
          max_capacity: Number(formData.max_capacity) || 60,
          status: formData.status
        });
      }

      setModalOpen(false);
    } catch (err) {
      console.error('Error creating academic item:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEdit = (item: any, type: TabType) => {
    setEditingItem({ type, id: item.id });
    if (type === 'DEPARTMENTS') {
      setEditFormData({
        name: item.name || item.department_name || '',
        code: item.code || item.department_code || '',
        description: item.description || '',
        admin_email: item.admin_email || item.email || '',
        head_of_department: item.head_of_department || '',
        status: item.status || 'ACTIVE'
      });
    } else if (type === 'PROGRAMS') {
      setEditFormData({
        name: item.name || item.program_name || '',
        code: item.code || item.program_code || '',
        degree_type: item.degree_type || 'B.Tech',
        department_id: item.department_id || targetDeptId,
        duration_years: item.duration_years || 4,
        total_semesters: item.total_semesters || 8,
        status: item.status || 'ACTIVE'
      });
    } else if (type === 'YEARS') {
      setEditFormData({
        name: item.name || item.year_name || '',
        is_current: Boolean(item.is_current),
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        status: item.status || 'ACTIVE'
      });
    } else if (type === 'BATCHES') {
      setEditFormData({
        name: item.name || item.batch_name || '',
        start_year: item.start_year || 2024,
        end_year: item.end_year || 2028,
        department_id: item.department_id || targetDeptId,
        status: item.status || 'ACTIVE'
      });
    } else if (type === 'SEMESTERS') {
      setEditFormData({
        name: item.name || item.semester_name || '',
        semester_number: item.semester_number || 1,
        status: item.status || 'ACTIVE'
      });
    } else if (type === 'SECTIONS') {
      setEditFormData({
        name: item.name || item.section_name || '',
        max_capacity: item.max_capacity || 60,
        status: item.status || 'ACTIVE'
      });
    }
    setEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editFormData.name?.trim()) return;

    setIsSaving(true);
    try {
      const { type, id } = editingItem;
      if (type === 'DEPARTMENTS') {
        if (!editFormData.admin_email?.trim()) {
          alert('Department Admin Email is required.');
          setIsSaving(false);
          return;
        }
        await updateDepartment(id, {
          name: editFormData.name.trim(),
          department_name: editFormData.name.trim(),
          code: editFormData.code.trim(),
          department_code: editFormData.code.trim(),
          description: editFormData.description.trim(),
          admin_email: editFormData.admin_email.trim().toLowerCase(),
          email: editFormData.admin_email.trim().toLowerCase(),
          head_of_department: editFormData.head_of_department?.trim(),
          status: editFormData.status
        });
      } else if (type === 'PROGRAMS') {
        await updateProgram(id, {
          name: editFormData.name.trim(),
          program_name: editFormData.name.trim(),
          code: editFormData.code.trim(),
          program_code: editFormData.code.trim(),
          degree_type: editFormData.degree_type,
          department_id: editFormData.department_id,
          duration_years: Number(editFormData.duration_years),
          total_semesters: Number(editFormData.total_semesters),
          status: editFormData.status
        });
      } else if (type === 'YEARS') {
        await updateAcademicYear(id, {
          name: editFormData.name.trim(),
          year_name: editFormData.name.trim(),
          is_current: Boolean(editFormData.is_current),
          start_date: editFormData.start_date,
          end_date: editFormData.end_date,
          status: editFormData.status
        });
      } else if (type === 'BATCHES') {
        await updateBatch(id, {
          name: editFormData.name.trim(),
          batch_name: editFormData.name.trim(),
          start_year: Number(editFormData.start_year),
          end_year: Number(editFormData.end_year),
          department_id: editFormData.department_id,
          status: editFormData.status
        });
      } else if (type === 'SEMESTERS') {
        await updateSemester(id, {
          name: editFormData.name.trim(),
          semester_name: editFormData.name.trim(),
          semester_number: Number(editFormData.semester_number),
          status: editFormData.status
        });
      } else if (type === 'SECTIONS') {
        await updateSection(id, {
          name: editFormData.name.trim(),
          section_name: editFormData.name.trim(),
          max_capacity: Number(editFormData.max_capacity),
          status: editFormData.status
        });
      }
      setEditModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error updating academic item:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { key: 'DEPARTMENTS', label: 'Departments', icon: Building2, count: visibleDepartments.length },
    { key: 'PROGRAMS', label: 'Programs', icon: GraduationCap, count: visiblePrograms.length },
    { key: 'YEARS', label: 'Academic Years', icon: Calendar, count: academicYears.length },
    { key: 'BATCHES', label: 'Batches', icon: Calendar, count: visibleBatches.length },
    { key: 'SEMESTERS', label: 'Semesters', icon: Layers, count: semesters.length },
    { key: 'SECTIONS', label: 'Sections', icon: Hash, count: sections.length },
  ] as const;

  const canAddCurrentTab = !(isDept && activeTab === 'DEPARTMENTS');

  const getDepartmentName = (deptId?: string) => {
    if (!deptId) return 'General';
    const d = departments.find(dep => dep.id === deptId || dep.department_id === deptId || dep.code === deptId);
    return d?.name || d?.department_name || deptId;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Academic Structure & Hierarchy
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isDept 
              ? `Manage programs, academic years, batches, semesters, and sections for ${myDeptObj?.name || 'your department'}`
              : 'Configure and edit institutional departments, degree programs, batches, semesters, and sections'}
          </p>
        </div>

        {canAddCurrentTab ? (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" /> Add {activeTab === 'YEARS' ? 'Academic Year' : activeTab === 'DEPARTMENTS' ? 'Department' : activeTab.slice(0, -1)}
          </button>
        ) : (
          <div className="text-xs text-slate-400 font-medium px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Departments managed by Super Admin
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key as TabType)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* DEPARTMENTS */}
        {activeTab === 'DEPARTMENTS' && visibleDepartments.map(d => (
          <div key={d.id} className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  {d.code || d.department_code || d.id || 'DEPT'}
                </span>
                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                  d.status === 'INACTIVE' 
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' 
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                }`}>
                  {d.status || 'ACTIVE'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mt-3 text-base">{d.name || d.department_name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{d.description || 'Academic Department Unit'}</p>
              {d.head_of_department && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-medium">HOD: {d.head_of_department}</p>
              )}
              {isDept && (
                <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-md">
                  Your Assigned Department
                </span>
              )}
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => handleOpenEdit(d, 'DEPARTMENTS')}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                title="Edit Department"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              {!isDept && (
                <button
                  onClick={() => deleteDepartment(d.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                  title="Delete Department"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* PROGRAMS */}
        {activeTab === 'PROGRAMS' && visiblePrograms.map(p => (
          <div key={p.id} className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 text-xs font-mono font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-lg">
                  {p.code || p.program_code || 'PROG'}
                </span>
                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                  p.status === 'INACTIVE' 
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' 
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                }`}>
                  {p.status || 'ACTIVE'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mt-3 text-base">{p.name || p.program_name}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-medium">
                  {p.degree_type || 'Degree Program'}
                </span>
                {p.duration_years && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {p.duration_years} Years ({p.total_semesters || (p.duration_years * 2)} Sems)
                  </span>
                )}
              </div>
              {p.department_id && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Dept: <span className="font-medium text-slate-700 dark:text-slate-300">{getDepartmentName(p.department_id)}</span>
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => handleOpenEdit(p, 'PROGRAMS')}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                title="Edit Program"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => deleteProgram(p.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                title="Delete Program"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {/* ACADEMIC YEARS */}
        {activeTab === 'YEARS' && academicYears.map(y => (
          <div key={y.id} className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                  y.is_current 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {y.is_current ? '● Current Active Year' : 'Academic Year'}
                </span>
                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                  y.status === 'INACTIVE' 
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' 
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                }`}>
                  {y.status || 'ACTIVE'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mt-3 text-lg">{y.name || y.year_name}</h3>
              {(y.start_date || y.end_date) && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {y.start_date || 'Start'} to {y.end_date || 'End'}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => handleOpenEdit(y, 'YEARS')}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                title="Edit Academic Year"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => deleteAcademicYear(y.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                title="Delete Academic Year"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {/* BATCHES */}
        {activeTab === 'BATCHES' && visibleBatches.map(b => (
          <div key={b.id} className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg">
                  {b.start_year ? `${b.start_year} - ${b.end_year}` : 'Batch'}
                </span>
                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                  b.status === 'INACTIVE' 
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' 
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                }`}>
                  {b.status || 'ACTIVE'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mt-3 text-base">{b.name || b.batch_name}</h3>
              {b.department_id && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Dept: <span className="font-medium text-slate-700 dark:text-slate-300">{getDepartmentName(b.department_id)}</span>
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => handleOpenEdit(b, 'BATCHES')}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                title="Edit Batch"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => deleteBatch(b.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                title="Delete Batch"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {/* SEMESTERS */}
        {activeTab === 'SEMESTERS' && semesters.map(s => (
          <div key={s.id} className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg">
                  Semester #{s.semester_number || 1}
                </span>
                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                  s.status === 'INACTIVE' 
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' 
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                }`}>
                  {s.status || 'ACTIVE'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mt-3 text-base">{s.name || s.semester_name}</h3>
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => handleOpenEdit(s, 'SEMESTERS')}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                title="Edit Semester"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => deleteSemester(s.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                title="Delete Semester"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {/* SECTIONS */}
        {activeTab === 'SECTIONS' && sections.map(sec => (
          <div key={sec.id} className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
                  Capacity: {sec.max_capacity || 60} Students
                </span>
                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                  sec.status === 'INACTIVE' 
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' 
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                }`}>
                  {sec.status || 'ACTIVE'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mt-3 text-base">{sec.name || sec.section_name}</h3>
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => handleOpenEdit(sec, 'SECTIONS')}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                title="Edit Section"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => deleteSection(sec.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                title="Delete Section"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Add New {activeTab === 'YEARS' ? 'Academic Year' : activeTab === 'DEPARTMENTS' ? 'Department' : activeTab.slice(0, -1)}
                </h2>
                <button 
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Name / Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={
                      activeTab === 'PROGRAMS' ? 'e.g. B.Tech Computer Science' :
                      activeTab === 'YEARS' ? 'e.g. 2024-2025' :
                      activeTab === 'BATCHES' ? 'e.g. Batch 2024-2028' :
                      activeTab === 'SEMESTERS' ? 'e.g. Semester 5' :
                      activeTab === 'SECTIONS' ? 'e.g. Section A' : 'e.g. Computer Science and Engineering'
                    }
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {(activeTab === 'DEPARTMENTS' || activeTab === 'PROGRAMS') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Code</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder={activeTab === 'DEPARTMENTS' ? 'e.g. CSE' : 'e.g. BT-CSE'}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}

                {activeTab === 'DEPARTMENTS' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Department Admin Email (Login ID) *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.admin_email}
                        onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                        placeholder="e.g. cse.head@smartattendai.com"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">This email will be required and used to log into the Department Portal.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief description of department..."
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'PROGRAMS' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Degree Type</label>
                        <select
                          value={formData.degree_type}
                          onChange={(e) => setFormData({ ...formData, degree_type: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="B.Tech">B.Tech / B.E.</option>
                          <option value="M.Tech">M.Tech / M.E.</option>
                          <option value="B.Sc">B.Sc</option>
                          <option value="M.Sc">M.Sc</option>
                          <option value="BCA">BCA</option>
                          <option value="MCA">MCA</option>
                          <option value="BBA">BBA</option>
                          <option value="MBA">MBA</option>
                          <option value="PhD">Ph.D.</option>
                          <option value="Diploma">Diploma</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                        <select
                          value={formData.department_id}
                          onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                          disabled={isDept}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name || d.department_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Duration (Years)</label>
                        <input
                          type="number"
                          min={1}
                          max={6}
                          value={formData.duration_years}
                          onChange={(e) => setFormData({ ...formData, duration_years: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Semesters</label>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={formData.total_semesters}
                          onChange={(e) => setFormData({ ...formData, total_semesters: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'BATCHES' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Year</label>
                      <input
                        type="number"
                        value={formData.start_year}
                        onChange={(e) => setFormData({ ...formData, start_year: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">End Year</label>
                      <input
                        type="number"
                        value={formData.end_year}
                        onChange={(e) => setFormData({ ...formData, end_year: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'SEMESTERS' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Semester Number</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={formData.semester_number}
                      onChange={(e) => setFormData({ ...formData, semester_number: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}

                {activeTab === 'SECTIONS' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Capacity (Students)</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={formData.max_capacity}
                      onChange={(e) => setFormData({ ...formData, max_capacity: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}

                {activeTab === 'YEARS' && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="is_current"
                      checked={formData.is_current}
                      onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="is_current" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Set as Current Academic Year
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm disabled:opacity-50"
                  >
                    {isSaving ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editModalOpen && editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Edit {editingItem.type === 'YEARS' ? 'Academic Year' : editingItem.type === 'DEPARTMENTS' ? 'Department' : editingItem.type.slice(0, -1)}
                </h2>
                <button 
                  onClick={() => setEditModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Name / Title *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {(editingItem.type === 'DEPARTMENTS' || editingItem.type === 'PROGRAMS') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Code</label>
                    <input
                      type="text"
                      value={editFormData.code || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}

                {editingItem.type === 'DEPARTMENTS' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Department Admin Email (Login ID) *
                      </label>
                      <input
                        type="email"
                        required
                        value={editFormData.admin_email || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, admin_email: e.target.value })}
                        placeholder="e.g. cse.head@smartattendai.com"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">This email is used to log into the Department Portal.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={editFormData.description || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Head of Department (HOD)</label>
                      <input
                        type="text"
                        value={editFormData.head_of_department || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, head_of_department: e.target.value })}
                        placeholder="e.g. Dr. John Doe"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </>
                )}

                {editingItem.type === 'PROGRAMS' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Degree Type</label>
                        <select
                          value={editFormData.degree_type || 'B.Tech'}
                          onChange={(e) => setEditFormData({ ...editFormData, degree_type: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="B.Tech">B.Tech / B.E.</option>
                          <option value="M.Tech">M.Tech / M.E.</option>
                          <option value="B.Sc">B.Sc</option>
                          <option value="M.Sc">M.Sc</option>
                          <option value="BCA">BCA</option>
                          <option value="MCA">MCA</option>
                          <option value="BBA">BBA</option>
                          <option value="MBA">MBA</option>
                          <option value="PhD">Ph.D.</option>
                          <option value="Diploma">Diploma</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                        <select
                          value={editFormData.department_id || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, department_id: e.target.value })}
                          disabled={isDept}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name || d.department_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Duration (Years)</label>
                        <input
                          type="number"
                          min={1}
                          max={6}
                          value={editFormData.duration_years || 4}
                          onChange={(e) => setEditFormData({ ...editFormData, duration_years: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Semesters</label>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={editFormData.total_semesters || 8}
                          onChange={(e) => setEditFormData({ ...editFormData, total_semesters: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  </>
                )}

                {editingItem.type === 'BATCHES' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Year</label>
                        <input
                          type="number"
                          value={editFormData.start_year || 2024}
                          onChange={(e) => setEditFormData({ ...editFormData, start_year: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">End Year</label>
                        <input
                          type="number"
                          value={editFormData.end_year || 2028}
                          onChange={(e) => setEditFormData({ ...editFormData, end_year: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                      <select
                        value={editFormData.department_id || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, department_id: e.target.value })}
                        disabled={isDept}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name || d.department_name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {editingItem.type === 'SEMESTERS' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Semester Number</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={editFormData.semester_number || 1}
                      onChange={(e) => setEditFormData({ ...editFormData, semester_number: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}

                {editingItem.type === 'SECTIONS' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Capacity (Students)</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={editFormData.max_capacity || 60}
                      onChange={(e) => setEditFormData({ ...editFormData, max_capacity: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}

                {editingItem.type === 'YEARS' && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="edit_is_current"
                      checked={Boolean(editFormData.is_current)}
                      onChange={(e) => setEditFormData({ ...editFormData, is_current: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="edit_is_current" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Set as Current Active Academic Year
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={editFormData.status || 'ACTIVE'}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm disabled:opacity-50"
                  >
                    {isSaving ? 'Updating...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AcademicStructure;
