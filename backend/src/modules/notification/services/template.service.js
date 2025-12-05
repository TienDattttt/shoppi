/**
 * Template Service
 * Handles notification template management and rendering
 */

const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');
const { v4: uuidv4 } = require('uuid');

/**
 * Get a template by type
 * @param {string} type - Template type
 * @returns {Promise<object|null>} Template or null if not found
 */
async function getTemplate(type) {
  const { data, error } = await supabaseAdmin
    .from('notification_templates')
    .select('*')
    .eq('type', type)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get template: ${error.message}`);
  }

  return data || null;
}

/**
 * Render a template by replacing variables with provided values
 * Variables are in the format {{variable_name}}
 * @param {object} template - Template object
 * @param {object} data - Data object with variable values
 * @returns {object} Rendered template with title and body
 */
function renderTemplate(template, data = {}) {
  if (!template) {
    return { title: '', body: '' };
  }

  const render = (text) => {
    if (!text) return '';
    
    // Replace all {{variable}} patterns with values from data
    return text.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      // Return the value if exists, otherwise empty string (Property 10)
      return data[variable] !== undefined ? String(data[variable]) : '';
    });
  };

  return {
    title: render(template.title_template),
    body: render(template.body_template),
    pushTitle: render(template.push_title || template.title_template),
    pushBody: render(template.push_body || template.body_template),
  };
}

/**
 * Create a new template
 * @param {object} templateData - Template data
 * @param {string} templateData.type - Unique template type
 * @param {string} templateData.title_template - Title template with {{variables}}
 * @param {string} templateData.body_template - Body template with {{variables}}
 * @param {string} [templateData.push_title] - Push notification title template
 * @param {string} [templateData.push_body] - Push notification body template
 * @param {string[]} [templateData.variables] - List of variable names used
 * @returns {Promise<object>} Created template
 */
async function createTemplate(templateData) {
  const { data, error } = await supabaseAdmin
    .from('notification_templates')
    .insert({
      id: uuidv4(),
      type: templateData.type,
      title_template: templateData.title_template,
      body_template: templateData.body_template,
      push_title: templateData.push_title,
      push_body: templateData.push_body,
      variables: templateData.variables || [],
      is_active: true,
      version: 1,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create template: ${error.message}`);
  }

  return data;
}


/**
 * Update an existing template
 * Creates a new version for audit trail
 * @param {string} type - Template type to update
 * @param {object} updateData - Fields to update
 * @returns {Promise<object>} Updated template
 */
async function updateTemplate(type, updateData) {
  // Get current template to increment version
  const current = await getTemplate(type);
  
  if (!current) {
    const error = new Error('Template not found');
    error.code = 'TEMPLATE_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const { data, error } = await supabaseAdmin
    .from('notification_templates')
    .update({
      ...updateData,
      version: current.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('type', type)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update template: ${error.message}`);
  }

  return data;
}

/**
 * Get all templates
 * @param {object} [options] - Query options
 * @param {boolean} [options.activeOnly=true] - Only return active templates
 * @returns {Promise<object[]>} Array of templates
 */
async function getAllTemplates(options = {}) {
  const { activeOnly = true } = options;

  let query = supabaseAdmin
    .from('notification_templates')
    .select('*')
    .order('type', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get templates: ${error.message}`);
  }

  return data || [];
}

/**
 * Deactivate a template (soft delete)
 * @param {string} type - Template type to deactivate
 * @returns {Promise<void>}
 */
async function deactivateTemplate(type) {
  const { error } = await supabaseAdmin
    .from('notification_templates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('type', type);

  if (error) {
    throw new Error(`Failed to deactivate template: ${error.message}`);
  }
}

/**
 * Extract variables from a template string
 * @param {string} templateString - Template string with {{variables}}
 * @returns {string[]} Array of variable names
 */
function extractVariables(templateString) {
  if (!templateString) return [];
  
  const matches = templateString.match(/\{\{(\w+)\}\}/g) || [];
  const variables = matches.map(match => match.replace(/\{\{|\}\}/g, ''));
  
  // Return unique variables
  return [...new Set(variables)];
}

module.exports = {
  getTemplate,
  renderTemplate,
  createTemplate,
  updateTemplate,
  getAllTemplates,
  deactivateTemplate,
  extractVariables,
};
