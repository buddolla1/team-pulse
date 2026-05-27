USE employee_management;

UPDATE leave_tracker_leaves lt
LEFT JOIN employees e
  ON lt.user_type = 'employee' AND e.id = lt.user_id
LEFT JOIN admin_users au
  ON lt.user_type = 'admin' AND au.id = lt.user_id
SET lt.sso = COALESCE(lt.sso, e.sso, au.username)
WHERE lt.sso IS NULL OR lt.sso = '';
