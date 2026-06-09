# =============================================================
# WSGI configuration for PythonAnywhere
# =============================================================
# In the PythonAnywhere "Web" tab, set the WSGI configuration file
# to point here, OR copy the contents below into the auto-generated
# /var/www/<youruser>_pythonanywhere_com_wsgi.py
#
# IMPORTANT: change `project_home` to YOUR path, e.g.
#   /home/mahdiyarvet/vetdose_pro
# =============================================================

import sys
import os

# --- 1. Point this to the folder that contains app.py ---
project_home = "/home/mahdiyarvet/vetdose_pro"

if project_home not in sys.path:
    sys.path.insert(0, project_home)

# --- 2. Import the Flask app object as `application` ---
from app import app as application
