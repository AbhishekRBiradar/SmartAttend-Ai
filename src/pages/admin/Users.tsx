import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit, ShieldCheck, Mail, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../../context/DataContext';
import { useAcademic } from '../../context/AcademicContext';
import { useAuth } from '../../context/AuthContext';

const Users = () => {
  const { departments } = useAcademic();
  const { user } = useAuth();
  const isDept = user?.role === 'DEPARTMENT_ADMIN';
  const isAdminUser = user?.role === 'ADMIN';
  const myDept = user?.department_id || (user as any)?.department;
  const myDeptObj = departments?.find(d => d.id === myDept || d.department_id === myDept || d.name === myDept || (d as any).department_name === myDept);
  const myDeptId = myDeptObj?.id || myDeptObj?.department_id || myDept;
  const myDeptName = myDeptObj?.name || (myDeptObj as any)?.department_name || myDept;

  const { users, teachers, courses, addUser, updateUser, deleteUser, addTeacher, updateTeacher, deleteTeacher } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState(isDept ? 'TEACHER' : 'All');
  const [departmentFilter, setDepartmentFilter] = useState(isDept ? myDept : 'All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<any>({ name: '', email: '', role: 'TEACHER', department_id: isDept ? myDeptId : '', employee_id: '', designation: 'Assistant Professor' });
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const uniqueDepartments = Array.from(new Set(users.map(u => u.department_id).filter(Boolean)));
  
  // Deduplicate users list by normalized email and unique user_id to guarantee no duplicate entries anywhere
  const deduplicatedUsers = React.useMemo(() => {
    const emailMap = new Map<string, any>();
    for (const u of users) {
      const normEmail = (u.email || '').trim().toLowerCase();
      const key = normEmail || u.user_id || (u as any).id;
      if (!key) continue;
      if (!emailMap.has(key)) {
        emailMap.set(key, u);
      } else {
        const existing = emailMap.get(key);
        const rolePriority: Record<string, number> = { SUPER_ADMIN: 5, ADMIN: 4, DEPARTMENT_ADMIN: 3, TEACHER: 2, STUDENT: 1 };
        const preferred = (rolePriority[u.role] || 0) >= (rolePriority[existing.role] || 0) ? u : existing;
        const preferredDept = u.department_id && u.department_id !== 'All' ? u.department_id : existing.department_id;
        emailMap.set(key, { ...existing, ...preferred, department_id: preferredDept });
      }
    }
    return Array.from(emailMap.values());
  }, [users]);

  const filteredUsers = deduplicatedUsers.filter(u => {
    if (isDept) {
      if (u.role === 'SUPER_ADMIN' || u.role === 'ADMIN') return false;
      const userDept = u.department_id || (u as any).department;
      const isMyDept = userDept === myDept || 
        userDept === myDeptId || 
        userDept === myDeptName || 
        (myDeptObj && (userDept === myDeptObj.id || userDept === myDeptObj.department_id || userDept === myDeptObj.name || (userDept as any) === (myDeptObj as any).department_name));
      if (!isMyDept) return false;
    }
    if (isAdminUser && (u.role === 'SUPER_ADMIN' || u.role === 'ADMIN' || u.role === 'DEPARTMENT_ADMIN')) return false;
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term)) ||
      (u.department_id && u.department_id.toLowerCase().includes(term)) ||
      (u.user_id && u.user_id.toLowerCase().includes(term))
    );
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    const matchesDepartment = isDept ? true : (departmentFilter === 'All' || 
      u.department_id === departmentFilter || 
      departments.some(d => (d.id === departmentFilter || d.department_id === departmentFilter || d.department_name === departmentFilter) && 
        (d.id === u.department_id || d.department_id === u.department_id || d.department_name === u.department_id)));
    const matchesSubject = true;
    
    return matchesSearch && matchesRole && matchesDepartment && matchesSubject;
  });

  const isFiltered = searchTerm !== '' || roleFilter !== (isDept ? 'TEACHER' : 'All') || departmentFilter !== (isDept ? myDept : 'All');

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter(isDept ? 'TEACHER' : 'All');
    setDepartmentFilter(isDept ? myDept : 'All');
  };

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, departmentFilter]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newUser.name.trim();
    const cleanEmail = newUser.email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) return;

    const userSnapshot = { ...newUser };
    const editId = editingUserId;

    setIsModalOpen(false);
    setEditingUserId(null);
    setNewUser({ name: '', email: '', role: 'TEACHER', department_id: isDept ? myDept : '', employee_id: '', designation: 'Assistant Professor', status: 'ACTIVE' } as any);

    try {
      // Find existing user across collection by editId or email
      const existingUser = users.find(u => u.user_id === editId || (u.email && u.email.trim().toLowerCase() === cleanEmail));
      const targetUserId = editId || existingUser?.user_id || `U${Date.now().toString().slice(-5)}${Math.floor(100 + Math.random() * 900)}`;

      if (userSnapshot.role === 'TEACHER') {
        const existingTeacher = teachers.find(t => t.user_id === targetUserId || t.id === targetUserId || (t.email && t.email.trim().toLowerCase() === cleanEmail));
        const teacherId = existingTeacher?.id || existingTeacher?.teacher_id || `FAC${Date.now().toString().slice(-6)}`;
        const selectedDept = isDept ? myDept : (userSnapshot.department_id || departments[0]?.department_id || departments[0]?.id || 'Computer Science');
        const teacherObj: any = {
          id: teacherId,
          teacher_id: teacherId,
          user_id: targetUserId,
          employee_id: userSnapshot.employee_id || `EMP-${teacherId}`,
          name: cleanName,
          email: cleanEmail,
          department_id: selectedDept,
          designation: userSnapshot.designation || 'Assistant Professor',
          status: userSnapshot.status || 'ACTIVE'
        };

        if (existingTeacher || teachers.some(t => t.id === teacherId)) {
          await updateTeacher(teacherId, teacherObj);
        } else {
          await addTeacher(teacherObj);
        }

        if (existingUser || editId) {
          await updateUser(targetUserId, { name: cleanName, email: cleanEmail, role: 'TEACHER', department_id: selectedDept, status: userSnapshot.status || 'ACTIVE' });
        } else {
          await addUser({
            id: targetUserId,
            user_id: targetUserId,
            name: cleanName,
            email: cleanEmail,
            role: 'TEACHER',
            department_id: selectedDept,
            status: userSnapshot.status || 'ACTIVE'
          });
        }
      } else {
        const selectedDept = userSnapshot.role === 'SUPER_ADMIN' ? 'All' : (userSnapshot.department_id || (isDept ? myDept : 'Computer Science'));
        const userToSave = { 
          name: cleanName,
          email: cleanEmail,
          role: userSnapshot.role,
          department_id: selectedDept,
          status: userSnapshot.status || 'ACTIVE'
        };
        
        if (existingUser || editId) {
          await updateUser(targetUserId, userToSave);
        } else {
          await addUser({ ...userToSave, id: targetUserId, user_id: targetUserId });
        }
      }
    } catch (err) {
      console.error("Error saving user:", err);
    }
  };

  const openAddModal = () => {
    setEditingUserId(null);
    setNewUser({ name: '', email: '', role: 'TEACHER', department_id: isDept ? myDept : '', employee_id: '', designation: 'Assistant Professor', status: 'ACTIVE' } as any);
    setIsModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditingUserId(user.user_id);
    const teacherData = teachers.find(t => t.user_id === user.user_id || t.id === user.user_id || (t.email && t.email.toLowerCase() === (user.email || '').toLowerCase()));
    setNewUser({ 
      name: user.name, 
      email: user.email, 
      role: user.role, 
      department_id: user.department_id || teacherData?.department_id || '',
      employee_id: teacherData?.employee_id || '',
      designation: teacherData?.designation || 'Assistant Professor',
      status: user.status || teacherData?.status || 'ACTIVE'
    } as any);
    setIsModalOpen(true);
  };

  const confirmDelete = (id: string) => {
    setUserToDelete(id);
  };

  useEffect(() => {
    const handleCloseAll = () => {
      setIsModalOpen(false);
      setUserToDelete(null);
    };
    window.addEventListener('close-all-modals', handleCloseAll);
    return () => window.removeEventListener('close-all-modals', handleCloseAll);
  }, []);

  const handleDelete = async () => {
    if (userToDelete) {
      const targetUser = users.find(u => u.user_id === userToDelete || u.id === userToDelete);
      const targetEmail = (targetUser?.email || '').trim().toLowerCase();
      
      // Also delete corresponding teacher record if exists
      const matchingTeacher = teachers.find(t => t.user_id === userToDelete || t.id === userToDelete || (targetEmail && (t.email || '').trim().toLowerCase() === targetEmail));
      if (matchingTeacher?.id) {
        await deleteTeacher(matchingTeacher.id);
      }

      // Delete any duplicate documents with the same email in users collection
      if (targetEmail) {
        const duplicateDocs = users.filter(u => (u.email || '').trim().toLowerCase() === targetEmail && u.user_id !== userToDelete);
        for (const dupe of duplicateDocs) {
          if (dupe.user_id) await deleteUser(dupe.user_id);
        }
      }

      await deleteUser(userToDelete);
      setUserToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">User Management</h2>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Manage administrators and teachers.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-4 border-b border-slate-500/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-500/5 dark:bg-slate-800/50">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Global search by name, email, role, department, subject..." 
              value={searchTerm || ''}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent glass-card shadow-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-300 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-xl">
              {['All', 'SUPER_ADMIN', 'TEACHER'].map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    setRoleFilter(role);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    roleFilter === role 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  {role === 'All' ? 'All Roles' : `${role}s`}
                </button>
              ))}
            </div>

{!isDept && (
            <select
              value={departmentFilter || ''}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 border border-slate-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm"
            >
              <option value="All">All Departments</option>
              {(departments || []).map(d => (
                <option key={d.id} value={d.id || d.department_id || d.department_name}>{d.department_name}</option>
              ))}
            </select>
          )}

            

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
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredUsers.length}</strong> of <strong className="text-slate-800 dark:text-slate-200">{users.length}</strong> users
          </span>
          {isFiltered && (
            <span className="text-indigo-600 font-medium">Active filters applied</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
                            <tr className="bg-slate-500/5 dark:bg-slate-800/50 border-b border-slate-500/10 text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm font-medium">
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Employee ID</th>
                <th className="p-4">Department</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user, idx) => (
                <motion.tr 
                  key={user.user_id || user.email || idx}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="border-b border-slate-500/10 hover:bg-slate-500/5 dark:bg-slate-800/50 transition-colors"
                >
                                    <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        user.role === 'SUPER_ADMIN' ? 'bg-indigo-100 text-indigo-700' : 
                        user.role === 'TEACHER' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white">{user.name}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                          <Mail className="w-3 h-3" /> {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'SUPER_ADMIN' ? 'bg-indigo-100 text-indigo-800' : 
                      user.role === 'TEACHER' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {user.role === 'SUPER_ADMIN' && <ShieldCheck className="w-3 h-3" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 dark:text-slate-300 text-sm">
                    {user.role === 'TEACHER' ? (teachers.find(t => t.user_id === user.user_id)?.employee_id || 'N/A') : 'N/A'}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 dark:text-slate-300 text-sm">
                    {departments.find(d => d.id === user.department_id || d.department_id === user.department_id || d.department_name === user.department_id)?.department_name || user.department_id || 'N/A'}                  
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => confirmDelete(user.user_id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors" 
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400">
                    No users found matching your search.
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
              Showing <span className="font-medium text-slate-800 dark:text-white">{startIndex + 1}</span> to <span className="font-medium text-slate-800 dark:text-white">{Math.min(startIndex + itemsPerPage, filteredUsers.length)}</span> of <span className="font-medium text-slate-800 dark:text-white">{filteredUsers.length}</span> users
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-slate-500/20 rounded-md text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                          : 'text-slate-600 dark:text-slate-300 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800'
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
                className="px-3 py-1 text-sm border border-slate-500/20 rounded-md text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Add User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-500/10">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{editingUserId ? 'Edit User' : 'Add New User'}</h3>
              </div>
              <form onSubmit={handleAddUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.name || ''}
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={newUser.email || ''}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Role</label>
                  <select 
                    required
                    value={newUser.role || ''}
                    onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isDept}
                  >
                    <option value='TEACHER'>Teacher</option>
                    {!isDept && !isAdminUser && <option value='SUPER_ADMIN'>Super Admin</option>}
                    {!isDept && !isAdminUser && <option value='ADMIN'>Admin</option>}
                    {!isDept && !isAdminUser && <option value='DEPARTMENT_ADMIN'>Department Admin</option>}
                    {!isDept && <option value='STUDENT'>Student</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Department</label>
                  <select 
                    required
                    value={newUser.department_id || ''}
                    onChange={e => setNewUser({...newUser, department_id: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isDept}
                  >
                    {!isDept ? (
                      <>
                        <option value="" disabled>Select Department</option>
                        <option value="All">All (Admin)</option>
                        {(departments || []).map(d => (
                          <option key={d.id} value={d.department_id || d.id || ''}>{d.department_name} ({d.department_code})</option>
                        ))}
                      </>
                    ) : (
                      <option value={myDeptId || myDept || ''}>{myDeptName || myDept || 'Your Department'}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Status</label>
                  <select
                    value={newUser.status || 'ACTIVE' || ''}
                    onChange={e => setNewUser({...newUser, status: e.target.value as any})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                {newUser.role === 'TEACHER' && (
                  <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Employee ID</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. EMP001"
                      value={newUser.employee_id || ''}
                      onChange={e => setNewUser({...newUser, employee_id: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Designation</label>
                    <select
                      value={newUser.designation || ''}
                      onChange={e => setNewUser({...newUser, designation: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Professor">Professor</option>
                      <option value="Associate Professor">Associate Professor</option>
                      <option value="Assistant Professor">Assistant Professor</option>
                      <option value="Lecturer">Lecturer</option>
                    </select>
                  </div>
                  </>
                )}
                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : (editingUserId ? 'Update User' : 'Save User')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
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
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Delete User?</h3>
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-6">
                  Are you sure you want to delete this user? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setUserToDelete(null)}
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

export default Users;
