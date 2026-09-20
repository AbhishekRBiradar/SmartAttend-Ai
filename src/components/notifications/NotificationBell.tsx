import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, ExternalLink, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/dateUtils';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationBellProps {
  historyPath?: string;
  themeColor?: 'indigo' | 'emerald' | 'amber' | 'blue' | 'purple';
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  historyPath = '/admin/notifications',
  themeColor = 'indigo'
}) => {
  const { user } = useAuth();
  const {
    getUserNotifications,
    getUserUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification
  } = useData();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notifications = getUserNotifications ? getUserNotifications(user?.user_id, user?.role, user?.department_id) : [];
  const unreadCount = getUserUnreadCount ? getUserUnreadCount(user?.user_id, user?.role, user?.department_id) : 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const badgeColor = {
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-600',
    blue: 'bg-blue-600',
    purple: 'bg-purple-600'
  }[themeColor] || 'bg-indigo-600';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-500/5 dark:bg-slate-800/50 rounded-xl transition-all duration-300 relative"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className={`absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white ${badgeColor} rounded-full flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-slate-900 animate-pulse`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col max-h-[480px]"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && markAllNotificationsAsRead && (
                <button
                  onClick={() => markAllNotificationsAsRead(user?.user_id)}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No notifications yet</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">You're all caught up!</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex gap-3 group relative ${
                      n.status === 'UNREAD' ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold truncate ${n.status === 'UNREAD' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatDateTime(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                      {n.link && (
                        <Link
                          to={n.link}
                          onClick={() => {
                            if (markNotificationAsRead && n.id) markNotificationAsRead(n.id);
                            setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline mt-1.5 font-medium"
                        >
                          View Details <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {n.status === 'UNREAD' && markNotificationAsRead && (
                        <button
                          onClick={() => markNotificationAsRead(n.id)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {deleteNotification && (
                        <button
                          onClick={() => deleteNotification(n.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {historyPath && (
              <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-center">
                <Link
                  to={historyPath}
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View All Notifications →
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
