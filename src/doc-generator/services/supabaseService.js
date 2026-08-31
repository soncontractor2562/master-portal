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

  // 3. Projects Registry
  async getProjects() {
    try {
      const { data, error } = await supabase.from('doc_generator_projects').select('*').order('created_at', { ascending: true });
      if (error) {
        console.error('Error fetching projects:', error);
        return [];
      }
      return data || [];
    } catch(e) {
      return [];
    }
  },
  async addProject(nameOrObj, owner = '', pr_prefix = '', pr_start_no = 1) {
    try {
      const payload = typeof nameOrObj === 'object' ? nameOrObj : { name: nameOrObj, owner, pr_prefix, pr_start_no };
      const { data, error } = await supabase.from('doc_generator_projects').insert([payload]).select();
      if (error) console.error('Error adding project:', error);
      return data ? data[0] : null;
    } catch(e) {
      return null;
    }
  },
  async updateProject(id, updates) {
    try {
      const { error } = await supabase.from('doc_generator_projects').update(updates).eq('id', id);
      if (error) console.error('Error updating project:', error);
    } catch(e) {}
  },
  async deleteProject(id) {
    try {
      const { error } = await supabase.from('doc_generator_projects').delete().eq('id', id);
      if (error) console.error('Error deleting project:', error);
    } catch(e) {}
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
