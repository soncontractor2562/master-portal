import { supabase } from '../supabaseClient';

export const docGeneratorService = {
  // 1. Company Settings
  async getCompanySettings() {
    const { data, error } = await supabase.from('doc_generator_presets').select('data').eq('type', 'company').is('name', null).maybeSingle();
    if (error) console.error('Error fetching company:', error);
    return data ? data.data : null;
  },
  async saveCompanySettings(companyData) {
    const { error } = await supabase.from('doc_generator_presets')
      .upsert({ type: 'company', name: null, data: companyData, updated_at: new Date().toISOString() }, { onConflict: 'type, name' });
    if (error) console.error('Error saving company:', error);
  },

  // 2. Named Presets
  async getPresets(type) {
    // type: 'report_preset' or 'request_preset'
    const { data, error } = await supabase.from('doc_generator_presets').select('id, name, data').eq('type', type).order('name', { ascending: true });
    if (error) console.error(`Error fetching ${type} presets:`, error);
    return data || [];
  },
  async savePreset(type, name, presetData) {
    const { error } = await supabase.from('doc_generator_presets')
      .upsert({ type, name, data: presetData, updated_at: new Date().toISOString() }, { onConflict: 'type, name' });
    if (error) console.error(`Error saving ${type} preset:`, error);
  },
  async deletePreset(id) {
    const { error } = await supabase.from('doc_generator_presets').delete().eq('id', id);
    if (error) console.error('Error deleting preset:', error);
  },
  async renamePreset(id, newName) {
    const { error } = await supabase.from('doc_generator_presets').update({ name: newName }).eq('id', id);
    if (error) throw error;
  },

  // 3. Projects Registry
  async getProjects() {
    const { data, error } = await supabase.from('doc_generator_projects').select('*').order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
    return data;
  },
  async addProject(name, owner) {
    const { data, error } = await supabase.from('doc_generator_projects').insert([{ name, owner }]).select();
    if (error) console.error('Error adding project:', error);
    return data ? data[0] : null;
  },
  async updateProject(id, updates) {
    const { error } = await supabase.from('doc_generator_projects').update(updates).eq('id', id);
    if (error) console.error('Error updating project:', error);
  },
  async deleteProject(id) {
    const { error } = await supabase.from('doc_generator_projects').delete().eq('id', id);
    if (error) console.error('Error deleting project:', error);
  },

  // 4. Documents History (Reports & Requests)
  async getDocuments() {
    const { data, error } = await supabase.from('doc_generator_documents').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
    return data;
  },
  async saveDocument(docType, date, projectName, documentData, existingId = null) {
    if (existingId) {
      const { data, error } = await supabase.from('doc_generator_documents')
        .update({ doc_type: docType, date, project_name: projectName, document_data: documentData })
        .eq('id', existingId).select();
      if (error) console.error('Error updating document:', error);
      return data ? data[0] : null;
    } else {
      const { data, error } = await supabase.from('doc_generator_documents').insert([{
        doc_type: docType,
        date,
        project_name: projectName,
        document_data: documentData
      }]).select();
      if (error) console.error('Error saving document:', error);
      return data ? data[0] : null;
    }
  },
  async deleteDocument(id) {
    const { error } = await supabase.from('doc_generator_documents').delete().eq('id', id);
    if (error) console.error('Error deleting document:', error);
  }
};
