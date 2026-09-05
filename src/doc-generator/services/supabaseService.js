import { supabase } from '../supabaseClient';

const LOCAL_DOCS_KEY = 'doc_generator_local_documents_v1';

export const docGeneratorService = {
  // Local storage helpers
  getLocalDocs() {
    try {
      const raw = localStorage.getItem(LOCAL_DOCS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) {
      return [];
    }
  },
  saveLocalDocs(docs) {
    try {
      localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(docs));
    } catch(e) {}
  },

  // 1. Company Settings
  async getCompanySettings() {
    try {
      const { data, error } = await supabase.from('doc_generator_presets').select('data').eq('type', 'company').is('name', null).maybeSingle();
      if (error) console.error('Error fetching company:', error);
      return data ? data.data : null;
    } catch(e) {
      return null;
    }
  },
  async saveCompanySettings(companyData) {
    try {
      const { error } = await supabase.from('doc_generator_presets')
        .upsert({ type: 'company', name: null, data: companyData, updated_at: new Date().toISOString() }, { onConflict: 'type, name' });
      if (error) console.error('Error saving company:', error);
    } catch(e) {}
  },

  // 1.1 Google Drive Settings
  async getGoogleDriveSettings() {
    try {
      const { data, error } = await supabase.from('doc_generator_presets').select('data').eq('type', 'google_drive_config').is('name', null).maybeSingle();
      if (error) console.error('Error fetching google drive settings:', error);
      if (data && data.data) {
        localStorage.setItem('doc_generator_google_drive_v1', JSON.stringify(data.data));
        return data.data;
      }
      const localRaw = localStorage.getItem('doc_generator_google_drive_v1');
      return localRaw ? JSON.parse(localRaw) : { webhookUrl: '', folderId: '', autoUpload: true };
    } catch(e) {
      const localRaw = localStorage.getItem('doc_generator_google_drive_v1');
      return localRaw ? JSON.parse(localRaw) : { webhookUrl: '', folderId: '', autoUpload: true };
    }
  },
  async saveGoogleDriveSettings(driveSettings) {
    try {
      localStorage.setItem('doc_generator_google_drive_v1', JSON.stringify(driveSettings));
      const { error } = await supabase.from('doc_generator_presets')
        .upsert({ type: 'google_drive_config', name: null, data: driveSettings, updated_at: new Date().toISOString() }, { onConflict: 'type, name' });
      if (error) console.error('Error saving google drive settings:', error);
    } catch(e) {}
  },

  // 2. Named Presets
  async getPresets(type) {
    try {
      const { data, error } = await supabase.from('doc_generator_presets').select('id, name, data').eq('type', type).order('name', { ascending: true });
      if (error) console.error(`Error fetching ${type} presets:`, error);
      return data || [];
    } catch(e) {
      return [];
    }
  },
  async savePreset(type, name, presetData) {
    try {
      const { error } = await supabase.from('doc_generator_presets')
        .upsert({ type, name, data: presetData, updated_at: new Date().toISOString() }, { onConflict: 'type, name' });
      if (error) console.error(`Error saving ${type} preset:`, error);
    } catch(e) {}
  },
  async deletePreset(id) {
    try {
      const { error } = await supabase.from('doc_generator_presets').delete().eq('id', id);
      if (error) console.error('Error deleting preset:', error);
    } catch(e) {}
  },
  async renamePreset(id, newName) {
    const { error } = await supabase.from('doc_generator_presets').update({ name: newName }).eq('id', id);
    if (error) throw error;
  },

  // Hidden "Default Form" preset
  async getDefaultForm(docType) {
    try {
      const key = docType === 'report' ? '__default_form_report__' : (docType === 'request' ? '__default_form_request__' : '__default_form_pr__');
      const { data, error } = await supabase.from('doc_generator_presets')
        .select('data').eq('type', key).is('name', null).maybeSingle();
      if (error) console.error('Error fetching default form:', error);
      return data ? data.data : null;
    } catch(e) {
      return null;
    }
  },
  async saveDefaultForm(docType, formData) {
    try {
      const key = docType === 'report' ? '__default_form_report__' : (docType === 'request' ? '__default_form_request__' : '__default_form_pr__');
      const { error } = await supabase.from('doc_generator_presets')
        .upsert({ type: key, name: null, data: formData, updated_at: new Date().toISOString() }, { onConflict: 'type, name' });
      if (error) console.error('Error saving default form:', error);
    } catch(e) {}
  },

  // Local storage project helpers
  getLocalProjects() {
    try {
      const raw = localStorage.getItem('daily_reports_projects_v1');
      return raw ? JSON.parse(raw) : [];
    } catch(e) {
      return [];
    }
  },
  saveLocalProjects(projects) {
    try {
      localStorage.setItem('daily_reports_projects_v1', JSON.stringify(projects));
    } catch(e) {}
  },

  // 3. Projects Registry
  async getProjects() {
    try {
      const localCached = this.getLocalProjects();
      const localMap = {};
      localCached.forEach(p => {
        if (p.id) localMap[p.id] = p;
        if (p.name) localMap[p.name] = p;
      });

      const { data, error } = await supabase.from('doc_generator_projects').select('*').order('created_at', { ascending: true });
      if (error) {
        console.warn('Using local projects cache:', error.message || error);
        return localCached;
      }

      const merged = (data || []).map(p => {
        const cached = localMap[p.id] || localMap[p.name] || {};
        return {
          ...p,
          pr_prefix: p.pr_prefix || cached.pr_prefix || 'PR-',
          pr_start_no: p.pr_start_no !== undefined ? p.pr_start_no : (cached.pr_start_no || 1)
        };
      });

      // Include any local-only projects
      const dbIds = new Set((data || []).map(p => p.id));
      const dbNames = new Set((data || []).map(p => p.name));
      localCached.forEach(lp => {
        if (!dbIds.has(lp.id) && !dbNames.has(lp.name)) {
          merged.push(lp);
        }
      });

      this.saveLocalProjects(merged);
      return merged;
    } catch(e) {
      return this.getLocalProjects();
    }
  },

  async addProject(nameOrObj, owner = '', pr_prefix = '', pr_start_no = 1) {
    try {
      const payload = typeof nameOrObj === 'object' ? nameOrObj : { name: nameOrObj, owner, pr_prefix, pr_start_no };
      const projName = (payload.name || '').trim();
      const projOwner = (payload.owner || '').trim();
      const projPrefix = (payload.pr_prefix || 'PR-').trim();
      const projStartNo = parseInt(payload.pr_start_no, 10) || 1;

      if (!projName) return null;

      // 1. Try full insert (if columns pr_prefix & pr_start_no exist in Supabase table)
      const { data, error } = await supabase.from('doc_generator_projects')
        .insert([{ name: projName, owner: projOwner, pr_prefix: projPrefix, pr_start_no: projStartNo }])
        .select();

      if (!error && data && data[0]) {
        const created = {
          ...data[0],
          pr_prefix: data[0].pr_prefix || projPrefix,
          pr_start_no: data[0].pr_start_no || projStartNo
        };
        const current = this.getLocalProjects();
        this.saveLocalProjects([...current.filter(p => p.id !== created.id), created]);
        return created;
      }

      // 2. Fallback: If error occurred (e.g. pr_prefix column not yet added to Supabase), insert basic schema
      console.warn('Full project insert failed, attempting basic schema fallback (name, owner):', error?.message);
      const { data: basicData, error: basicErr } = await supabase.from('doc_generator_projects')
        .insert([{ name: projName, owner: projOwner }])
        .select();

      if (!basicErr && basicData && basicData[0]) {
        const created = {
          ...basicData[0],
          pr_prefix: projPrefix,
          pr_start_no: projStartNo
        };
        const current = this.getLocalProjects();
        this.saveLocalProjects([...current.filter(p => p.id !== created.id), created]);
        return created;
      }

      // 3. Ultimate Fallback: Local project creation
      console.warn('Supabase project insert failed, saving locally:', basicErr?.message);
      const localProject = {
        id: 'proj_' + Date.now(),
        name: projName,
        owner: projOwner,
        pr_prefix: projPrefix,
        pr_start_no: projStartNo,
        created_at: new Date().toISOString()
      };
      const current = this.getLocalProjects();
      this.saveLocalProjects([...current, localProject]);
      return localProject;
    } catch(e) {
      console.error('addProject error:', e);
      const localProject = {
        id: 'proj_' + Date.now(),
        name: typeof nameOrObj === 'object' ? nameOrObj.name : nameOrObj,
        owner: typeof nameOrObj === 'object' ? nameOrObj.owner : owner,
        pr_prefix: typeof nameOrObj === 'object' ? (nameOrObj.pr_prefix || 'PR-') : (pr_prefix || 'PR-'),
        pr_start_no: typeof nameOrObj === 'object' ? (nameOrObj.pr_start_no || 1) : (pr_start_no || 1),
        created_at: new Date().toISOString()
      };
      const current = this.getLocalProjects();
      this.saveLocalProjects([...current, localProject]);
      return localProject;
    }
  },

  async updateProject(id, updates) {
    try {
      const local = this.getLocalProjects();
      const updatedLocal = local.map(p => p.id === id ? { ...p, ...updates } : p);
      this.saveLocalProjects(updatedLocal);

      const { error } = await supabase.from('doc_generator_projects').update(updates).eq('id', id);
      if (error) {
        // Fallback: update only existing basic columns (name, owner)
        const safeUpdates = {};
        if (updates.name !== undefined) safeUpdates.name = updates.name;
        if (updates.owner !== undefined) safeUpdates.owner = updates.owner;
        if (Object.keys(safeUpdates).length > 0) {
          await supabase.from('doc_generator_projects').update(safeUpdates).eq('id', id);
        }
      }
    } catch(e) {
      console.warn('updateProject error:', e);
    }
  },

  async deleteProject(id) {
    try {
      const local = this.getLocalProjects().filter(p => p.id !== id);
      this.saveLocalProjects(local);
      await supabase.from('doc_generator_projects').delete().eq('id', id);
    } catch(e) {
      console.warn('deleteProject error:', e);
    }
  },

  // 4. Documents History & Drafts (Hybrid Cloud + Local Fallback)
  async getDocuments() {
    try {
      const { data, error } = await supabase.from('doc_generator_documents').select('*').order('created_at', { ascending: false });
      if (error) {
        console.warn('Using local documents cache:', error.message || error);
        return this.getLocalDocs();
      }
      if (data && data.length > 0) {
        this.saveLocalDocs(data);
        return data;
      }
      // If supabase empty, check local
      const local = this.getLocalDocs();
      return local.length > 0 ? local : (data || []);
    } catch(e) {
      return this.getLocalDocs();
    }
  },

  async saveDocument(docType, date, projectName, documentData, existingId = null) {
    let savedRecord = null;
    const nowIso = new Date().toISOString();

    try {
      if (existingId) {
        const { data, error } = await supabase.from('doc_generator_documents')
          .update({ doc_type: docType, date, project_name: projectName, document_data: documentData })
          .eq('id', existingId).select();
        if (!error && data && data[0]) {
          savedRecord = data[0];
        } else {
          console.warn('Supabase update error, saving locally:', error);
        }
      } else {
        const { data, error } = await supabase.from('doc_generator_documents').insert([{
          doc_type: docType,
          date,
          project_name: projectName,
          document_data: documentData
        }]).select();
        if (!error && data && data[0]) {
          savedRecord = data[0];
        } else {
          console.warn('Supabase insert error, saving locally:', error);
        }
      }
    } catch(e) {
      console.warn('Supabase offline, saving locally:', e);
    }

    // Always update local cache for instant reactivity
    const local = this.getLocalDocs();
    if (savedRecord) {
      const idx = local.findIndex(x => x.id === savedRecord.id);
      if (idx !== -1) {
        local[idx] = savedRecord;
      } else {
        local.unshift(savedRecord);
      }
      this.saveLocalDocs(local);
      return savedRecord;
    } else {
      // Create local record if Supabase was unavailable
      const localId = existingId || ('loc_' + Date.now() + '_' + Math.floor(Math.random() * 9999));
      const fallbackRecord = {
        id: localId,
        doc_type: docType,
        date: date,
        project_name: projectName,
        document_data: documentData,
        created_at: nowIso,
        updated_at: nowIso
      };
      const idx = local.findIndex(x => x.id === localId);
      if (idx !== -1) {
        local[idx] = fallbackRecord;
      } else {
        local.unshift(fallbackRecord);
      }
      this.saveLocalDocs(local);
      return fallbackRecord;
    }
  },

  async deleteDocument(id) {
    try {
      const { error } = await supabase.from('doc_generator_documents').delete().eq('id', id);
      if (error) console.error('Error deleting document from Supabase:', error);
    } catch(e) {}

    const local = this.getLocalDocs().filter(x => x.id !== id);
    this.saveLocalDocs(local);
  }
};
