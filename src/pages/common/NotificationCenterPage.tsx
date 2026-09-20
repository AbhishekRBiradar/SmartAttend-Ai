import React, { useState } from 'react';
import { Bell, Check, Trash2, ExternalLink, AlertTriangle, CheckCircle2, Info, Send, Plus, X, Users, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../../utils/dateUtils';

const NotificationCenterPage = () => {
  const { user } = useAuth();
  const {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    sendNotification,
    students,
    teachers
  } = useData();
  const { departments } = useAcademic();

  const [filterType, setFilterType] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const isDept = user?.role === 'DEPARTMENT_ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const canSend = isAdmin || isDept || isTeacher;

  const { courseOfferings, enrollments, courses } = useData();

  const myDept = user?.department_id || (user as any)?.department;
  const myDeptObj = departments?.find(d => d.id === myDept || d.department_id === myDept || d.name === myDept || (d as any).department_name === myDept);
  const myDeptId = myDeptObj?.id || myDeptObj?.department_id || myDept;
  const myDeptName = myDeptObj?.name || (myDeptObj as any)?.department_name || myDept;

  // Teacher specific offerings and enrolled students
  const teacherOfferings = courseOfferings.filter(o => 
    o.teacher_id === user?.user_id || 
    (user && (user as any).id && o.teacher_id === (user as any).id) || 
    (o.teacher_name && user?.name && o.teacher_name.toLowerCase().includes((user.name || '').toLowerCase()))
  );
  const activeTeacherOfferings = teacherOfferings.length > 0 ? teacherOfferings : courseOfferings.slice(0, 3);
  const teacherOfferingIds = new Set(activeTeacherOfferings.map(o => o.id));

  const teacherEnrolledStudentIds = new Set(
    enrollments.filter(e => teacherOfferingIds.has(e.course_offering_id) && e.status !== 'INACTIVE').map(e => e.student_id)
  );

  // Filter students & teachers for department admin / teacher
  const deptStudents = students.filter(s => {
    if (isTeacher) {
      return teacherEnrolledStudentIds.has(s.id) || teacherEnrolledStudentIds.has(s.user_id) || teacherEnrolledStudentIds.size === 0;
    }
    if (!isDept) return true;
    const sDept = s.department_id || s.department;
    return sDept === myDept || sDept === myDeptId || sDept === myDeptName || 
      (myDeptObj && (sDept === myDeptObj.id || sDept === myDeptObj.department_id || sDept === myDeptObj.name || (sDept as any) === (myDeptObj as any).department_name));
  });

  const deptTeachers = teachers.filter(t => {
    if (!isDept) return true;
    const tDept = t.department_id || (t as any).department;
    return tDept === myDept || tDept === myDeptId || tDept === myDeptName || 
      (myDeptObj && (tDept === myDeptObj.id || tDept === myDeptObj.department_id || tDept === myDeptObj.name || (tDept as any) === (myDeptObj as any).department_name));
  });

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'INFO' as 'INFO' | 'ALERT' | 'WARNING' | 'SUCCESS',
    audienceType: isTeacher ? 'ALL_MY_CLASSES' : isDept ? 'DEPT_ALL' : 'ALL',
    selectedRecipientId: '',
    selectedDeptId: isDept ? (myDeptId || '') : '',
    selectedOfferingId: activeTeacherOfferings[0]?.id || '',
    link: ''
  });

  const notifications = getUserNotifications ? getUserNotifications(user?.user_id, user?.role, user?.department_id) : [];

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'UNREAD') return n.status === 'UNREAD';
    if (filterType === 'ALERT') return n.type === 'ALERT' || n.type === 'WARNING';
    return true;
  });

  const getIcon = (type?: string) => {
    switch (type) {
      case 'WARNING':
      case 'ALERT':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      default:
        return <Info className="w-5 h-5 text-indigo-500" />;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim() || !sendNotification) return;

    setIsSending(true);
    try {
      let recipientId = formData.audienceType;
      let targetDept = isDept ? myDeptId : formData.selectedDeptId;

      if (formData.audienceType === 'SPECIFIC_STUDENT' || formData.audienceType === 'SPECIFIC_TEACHER') {
        recipientId = formData.selectedRecipientId;
      } else if (formData.audienceType === 'ASSIGNED_OFFERING') {
        recipientId = `OFFERING_${formData.selectedOfferingId}`;
      } else if (formData.audienceType === 'ALL_MY_CLASSES') {
        recipientId = 'ALL_MY_STUDENTS';
      }

      await sendNotification({
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        recipient_id: recipientId,
        department_id: targetDept,
        course_offering_id: formData.audienceType === 'ASSIGNED_OFFERING' ? formData.selectedOfferingId : undefined,
        link: formData.link.trim() || undefined,
        sender_name: user?.name || (isTeacher ? 'Faculty Instructor' : isDept ? `${myDeptName} Admin` : 'Administrator'),
        sender_role: user?.role || (isTeacher ? 'TEACHER' : 'DEPARTMENT_ADMIN')
      });

      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        message: '',
        type: 'INFO',
        audienceType: isTeacher ? 'ALL_MY_CLASSES' : isDept ? 'DEPT_ALL' : 'ALL',
        selectedRecipientId: '',
        selectedDeptId: isDept ? (myDeptId || '') : '',
        selectedOfferingId: activeTeacherOfferings[0]?.id || '',
        link: ''
      });
    } catch (err) {
      console.error('Error sending notification:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Notification Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isDept 
              ? `Department announcements, student alerts, and faculty communications for ${myDeptName || 'your department'}`
              : 'System announcements, attendance alerts, exam notifications, and security logs'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canSend && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-500/20"
            >
              <Send className="w-4 h-4" /> Send Notification
            </button>
          )}

          {notifications.some(n => n.status === 'UNREAD') && markAllNotificationsAsRead && (
            <button
              onClick={() => markAllNotificationsAsRead(user?.user_id)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl text-sm font-semibold transition-all"
            >
              <Check className="w-4 h-4" /> Mark All Read
            </button>
          )}
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          {(['ALL', 'UNREAD', 'ALERT'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterType === tab
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredNotifications.map(n => (
            <div
              key={n.id}
              className={`p-4 rounded-xl transition-all flex items-start gap-4 ${
                n.status === 'UNREAD' ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm shrink-0">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {n.title}
                  </h4>
                  <span className="text-xs text-slate-400 font-mono shrink-0">
                    {formatDateTime(n.created_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {n.message}
                </p>
                {n.sender_name && (
                  <div className="mt-2 text-[11px] text-slate-400">
                    Sent by: <span className="font-medium text-slate-600 dark:text-slate-300">{n.sender_name}</span> ({n.sender_role || 'STAFF'})
                  </div>
                )}
                {n.link && (
                  <Link
                    to={n.link}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-2 hover:underline"
                  >
                    View Destination <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {n.status === 'UNREAD' && markNotificationAsRead && (
                  <button
                    onClick={() => markNotificationAsRead(n.id)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {deleteNotification && (
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredNotifications.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-base font-semibold text-slate-600 dark:text-slate-300">No Notifications</p>
              <p className="text-xs mt-1">You have no active alerts matching this filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create / Send Notification Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {isTeacher 
                        ? 'Create Class Announcement'
                        : isDept 
                        ? `Send Department Notification (${myDeptName})` 
                        : 'Send System Notification'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isTeacher
                        ? 'Broadcast messages or alerts to your assigned class rosters'
                        : isDept 
                        ? 'Send alerts to students and faculty in your department' 
                        : 'Broadcast announcements and alerts'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSend} className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Notification Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isTeacher ? "e.g. Lab report submission deadline / Class test schedule" : "e.g. Schedule update for CS301 / Lab Exam Announcement"}
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Notification Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="INFO">Information (Info)</option>
                      <option value="ALERT">Important Alert</option>
                      <option value="WARNING">Warning</option>
                      <option value="SUCCESS">Success / Clearance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Target Audience
                    </label>
                    <select
                      value={formData.audienceType}
                      onChange={e => setFormData({ ...formData, audienceType: e.target.value, selectedRecipientId: '' })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {isTeacher ? (
                        <>
                          <option value="ALL_MY_CLASSES">All My Assigned Classes</option>
                          <option value="ASSIGNED_OFFERING">Specific Assigned Course</option>
                          <option value="SPECIFIC_STUDENT">Specific Student in My Class</option>
                        </>
                      ) : isDept ? (
                        <>
                          <option value="DEPT_ALL">All in Department ({myDeptName})</option>
                          <option value="DEPT_STUDENTS">Department Students Only</option>
                          <option value="DEPT_TEACHERS">Department Faculty Only</option>
                          <option value="SPECIFIC_STUDENT">Specific Student</option>
                          <option value="SPECIFIC_TEACHER">Specific Faculty Member</option>
                        </>
                      ) : (
                        <>
                          <option value="ALL">All Users (Broadcast)</option>
                          <option value="ALL_STUDENTS">All Students</option>
                          <option value="ALL_TEACHERS">All Teachers</option>
                          <option value="ALL_DEPT_ADMINS">All Department Admins</option>
                          <option value="SPECIFIC_STUDENT">Specific Student</option>
                          <option value="SPECIFIC_TEACHER">Specific Teacher</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {isTeacher && formData.audienceType === 'ASSIGNED_OFFERING' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Select Assigned Course Offering *
                    </label>
                    <select
                      required
                      value={formData.selectedOfferingId}
                      onChange={e => setFormData({ ...formData, selectedOfferingId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {activeTeacherOfferings.map(o => {
                        const c = courses.find(item => item.id === o.course_id);
                        return (
                          <option key={o.id} value={o.id}>
                            {c?.course_code || o.course_code || 'CS301'} - {c?.course_name || o.course_name || 'Subject'} (Sec {o.section_id || o.section || 'A'})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {formData.audienceType === 'SPECIFIC_STUDENT' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Select Student *
                    </label>
                    <select
                      required
                      value={formData.selectedRecipientId}
                      onChange={e => setFormData({ ...formData, selectedRecipientId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="" disabled>Select Student</option>
                      {deptStudents.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.id}) - {s.department || s.department_id || 'Dept'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.audienceType === 'SPECIFIC_TEACHER' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Select Faculty Member *
                    </label>
                    <select
                      required
                      value={formData.selectedRecipientId}
                      onChange={e => setFormData({ ...formData, selectedRecipientId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="" disabled>Select Faculty</option>
                      {deptTeachers.map(t => (
                        <option key={t.id || (t as any).teacher_id} value={t.user_id || t.id || (t as any).teacher_id}>
                          {t.name} ({t.designation || 'Faculty'}) - {t.department_id || 'Dept'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Message Content *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Enter the detailed announcement or message..."
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Action Link (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /admin/timetable or /student/courses"
                    value={formData.link}
                    onChange={e => setFormData({ ...formData, link: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" /> {isSending ? 'Sending...' : 'Send Notification'}
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

export default NotificationCenterPage;
