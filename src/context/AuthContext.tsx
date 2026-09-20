import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { User, Role } from '../types';

export const PREDEFINED_DEMO_ACCOUNTS: Record<string, { email: string; role: Role; name: string; department_id?: string }> = {
  'abhishekrbiradar908a@gmail.com': {
    email: 'abhishekrbiradar908a@gmail.com',
    role: 'SUPER_ADMIN',
    name: 'Abhishek Biradar (Super Admin)',
    department_id: 'All'
  },
  'naveen@smartattendai.com': {
    email: 'naveen@smartattendai.com',
    role: 'DEPARTMENT_ADMIN',
    name: 'Naveen (Department Admin)',
    department_id: 'dept-cse'
  },
  'admin@smartattend.ai': {
    email: 'admin@smartattend.ai',
    role: 'ADMIN',
    name: 'System Admin',
    department_id: 'All'
  },
  'smartattendai@gmail.com': {
    email: 'smartattendai@gmail.com',
    role: 'SUPER_ADMIN',
    name: 'SmartAttend Super Admin',
    department_id: 'All'
  },
  'deptadmin@smartattend.ai': {
    email: 'deptadmin@smartattend.ai',
    role: 'DEPARTMENT_ADMIN',
    name: 'Prof. CSE Head',
    department_id: 'dept-cse'
  },
  'teacher@smartattend.ai': {
    email: 'teacher@smartattend.ai',
    role: 'TEACHER',
    name: 'Dr. Robert Jenkins',
    department_id: 'dept-cse'
  },
  'student@smartattend.ai': {
    email: 'student@smartattend.ai',
    role: 'STUDENT',
    name: 'Abhi Kumar Sharma',
    department_id: 'dept-cse'
  }
};

const getAuthErrorMessage = (error: any): string => {
  if (!error) return 'Authentication failed. Please try again.';
  const code = error.code || '';
  switch (code) {
    case 'auth/user-not-found':
      return 'No registered account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please verify your password and try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/invalid-email':
      return 'The email address format is invalid. Please check and try again.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact your system administrator.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to multiple failed login attempts. Please try again later or reset your password.';
    case 'auth/network-request-failed':
      return 'Network error occurred. Please check your internet connection.';
    default:
      return error.message || 'Authentication failed. Please verify your credentials.';
  }
};

const isRoleAuthorizedForPortal = (userRole: Role, portalRole: Role): boolean => {
  if (portalRole === 'SUPER_ADMIN') {
    return userRole === 'SUPER_ADMIN';
  }
  if (portalRole === 'ADMIN') {
    return userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  }
  if (portalRole === 'DEPARTMENT_ADMIN') {
    return userRole === 'DEPARTMENT_ADMIN' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  }
  if (portalRole === 'TEACHER') {
    return userRole === 'TEACHER';
  }
  if (portalRole === 'STUDENT') {
    return userRole === 'STUDENT';
  }
  return true;
};

const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'SUPER_ADMIN': return 'Super Admin';
    case 'ADMIN': return 'Admin';
    case 'DEPARTMENT_ADMIN': return 'Department Admin';
    case 'TEACHER': return 'Teacher';
    case 'STUDENT': return 'Student';
    default: return role;
  }
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean, requestedRole?: Role | null, department_id?: string) => Promise<User>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        if (unsubscribeDoc) { unsubscribeDoc(); unsubscribeDoc = undefined; }
        unsubscribeDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            if (userData.status === 'INACTIVE') {
              signOut(auth).catch(() => {});
              setIsAuthenticated(false);
              setUser(null);
            } else {
              setUser(userData);
              setIsAuthenticated(true);
            }
          } else {
            // User doc missing in Firestore: check if predefined demo account
            const email = (firebaseUser.email || '').trim().toLowerCase();
            const predefined = PREDEFINED_DEMO_ACCOUNTS[email];

            if (predefined) {
              createPredefinedUserDocument(firebaseUser.uid, predefined)
                .then((createdUser) => {
                  setUser(createdUser);
                  setIsAuthenticated(true);
                })
                .catch(err => console.warn("Notice: could not create demo user profile:", err));
            } else {
              // Non-predefined user without a Firestore profile: sign out
              signOut(auth).catch(() => {});
              setIsAuthenticated(false);
              setUser(null);
            }
          }
          setIsAuthReady(true);
        }, (error) => {
          console.warn("Notice: could not stream user profile from Firestore.", error);
          setIsAuthenticated(false);
          setUser(null);
          setIsAuthReady(true);
        });
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setIsAuthReady(true);
        if (unsubscribeDoc) unsubscribeDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  // Inactivity auto-logout (10 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        logout();
      }, 10 * 60 * 1000); // 10 minutes
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated]);

  const createPredefinedUserDocument = async (user_id: string, config: { email: string; role: Role; name: string; department_id?: string }): Promise<User> => {
    const newUser: User = {
      user_id: user_id,
      name: config.name,
      email: config.email,
      role: config.role,
      status: 'ACTIVE',
      department_id: config.department_id || 'dept-cse',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', user_id), newUser);
    return newUser;
  };

  const login = async (
    emailInput: string, 
    passwordInput: string, 
    rememberMe: boolean = false, 
    requestedRole?: Role | null, 
    department_id?: string
  ): Promise<User> => {
    const cleanEmail = (emailInput || '').trim().toLowerCase();
    const cleanPassword = passwordInput || '';

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Please enter both email and password.');
    }

    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
    } catch (authError: any) {
      // ONLY if this is a known predefined demo account using the official demo password ('password123')
      // and it does not exist yet in Firebase Auth (e.g. clean tenant), initialize the demo credentials
      const isPredefinedDemo = !!PREDEFINED_DEMO_ACCOUNTS[cleanEmail] && cleanPassword === 'password123';
      const isNotFound = authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential';

      if (isPredefinedDemo && isNotFound) {
        try {
          userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        } catch (signupErr) {
          throw new Error(getAuthErrorMessage(authError));
        }
      } else {
        // Strictly reject any other credentials / passwords
        throw new Error(getAuthErrorMessage(authError));
      }
    }

    const user_id = userCredential.user.uid;

    // Fetch user profile from Firestore
    let userData: User | null = null;
    try {
      const userDoc = await getDoc(doc(db, 'users', user_id));
      if (userDoc.exists()) {
        userData = userDoc.data() as User;
      } else {
        // Check if there is an existing user document created with this email
        const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          userData = querySnap.docs[0].data() as User;
          // Sync doc under current uid
          await setDoc(doc(db, 'users', user_id), { ...userData, user_id }, { merge: true });
        }
      }
    } catch (err) {
      console.warn("Could not read user profile doc during login", err);
    }

    // Check if predefined demo account or department admin email
    const predefined = PREDEFINED_DEMO_ACCOUNTS[cleanEmail];
    if (predefined) {
      if (!userData || userData.role !== predefined.role || userData.department_id !== predefined.department_id) {
        userData = {
          ...(userData || {}),
          user_id,
          email: predefined.email,
          name: predefined.name,
          role: predefined.role,
          status: 'ACTIVE',
          department_id: predefined.department_id,
          created_at: userData?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', user_id), userData, { merge: true });
      }
    } else if (!userData) {
      // Check if matching any department admin email in departments collection
      try {
        const deptQuery = query(collection(db, 'departments'), where('admin_email', '==', cleanEmail));
        const deptSnap = await getDocs(deptQuery);
        let matchedDeptId = '';
        let matchedDeptName = '';
        if (!deptSnap.empty) {
          matchedDeptId = deptSnap.docs[0].id;
          const deptData = deptSnap.docs[0].data();
          matchedDeptName = deptData.name || deptData.department_name || 'Department';
        } else {
          const deptQuery2 = query(collection(db, 'departments'), where('email', '==', cleanEmail));
          const deptSnap2 = await getDocs(deptQuery2);
          if (!deptSnap2.empty) {
            matchedDeptId = deptSnap2.docs[0].id;
            const deptData2 = deptSnap2.docs[0].data();
            matchedDeptName = deptData2.name || deptData2.department_name || 'Department';
          }
        }

        if (matchedDeptId) {
          userData = {
            user_id,
            email: cleanEmail,
            name: `${matchedDeptName} Admin`,
            role: 'DEPARTMENT_ADMIN',
            status: 'ACTIVE',
            department_id: matchedDeptId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', user_id), userData);
        } else {
          await signOut(auth);
          throw new Error('Account profile not found in system. Please contact an administrator to set up your account.');
        }
      } catch (deptErr: any) {
        await signOut(auth);
        throw new Error(deptErr.message || 'Account profile not found in system.');
      }
    }

    // Check if account or department is deleted
    try {
      const delQuery = query(collection(db, 'deletedRecords'), where('userData.email', '==', cleanEmail));
      const delSnap = await getDocs(delQuery);
      if (!delSnap.empty && userData?.status !== 'ACTIVE') {
        await signOut(auth);
        throw new Error('Access Denied: This account has been deleted. You cannot log in until allowed and reactivated by an administrator.');
      }
      const delStudentQuery = query(collection(db, 'deletedRecords'), where('studentData.email', '==', cleanEmail));
      const delStudentSnap = await getDocs(delStudentQuery);
      if (!delStudentSnap.empty && userData?.status !== 'ACTIVE') {
        await signOut(auth);
        throw new Error('Access Denied: This account has been deleted. You cannot log in until allowed and reactivated by an administrator.');
      }
    } catch (delErr: any) {
      if (delErr.message && delErr.message.includes('Access Denied')) throw delErr;
    }

    // Check account status
    if (userData.status === 'INACTIVE' || userData.status === 'DELETED') {
      await signOut(auth);
      throw new Error('Access Denied: Your account has been deactivated or deleted. Please contact an administrator.');
    }

    // If Department Admin, check if department still exists
    if (userData.role === 'DEPARTMENT_ADMIN' && userData.department_id && userData.department_id !== 'All') {
      try {
        const deptDoc = await getDoc(doc(db, 'departments', userData.department_id));
        if (!deptDoc.exists()) {
          await signOut(auth);
          throw new Error('Access Denied: The department associated with this account has been deleted.');
        }
      } catch (deptCheckErr: any) {
        if (deptCheckErr.message && deptCheckErr.message.includes('Access Denied')) throw deptCheckErr;
      }
    }

    // Validate role permissions against the selected portal
    if (requestedRole) {
      const authorized = isRoleAuthorizedForPortal(userData.role, requestedRole);
      if (!authorized) {
        await signOut(auth);
        const actualRoleName = getRoleDisplayName(userData.role);
        const requestedRoleName = getRoleDisplayName(requestedRole);
        throw new Error(`Access Denied: Your account is registered as a ${actualRoleName}. Please log in through the ${actualRoleName} Portal.`);
      }

      // If Department Admin portal, check department binding
      if (requestedRole === 'DEPARTMENT_ADMIN' && department_id) {
        if (userData.department_id && userData.department_id !== 'All' && userData.department_id !== department_id) {
          await signOut(auth);
          throw new Error('Access Denied: Your account is registered with a different department.');
        }
      }
    }

    setUser(userData);
    setIsAuthenticated(true);
    return userData;
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.warn("Error signing out:", error);
    }
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    await sendPasswordResetEmail(auth, cleanEmail);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, resetPassword, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
