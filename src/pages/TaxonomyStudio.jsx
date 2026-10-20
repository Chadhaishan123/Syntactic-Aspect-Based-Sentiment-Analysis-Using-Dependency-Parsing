import React, { useState, useEffect } from 'react';
import {
  Tag,
  FolderTree,
  Plus,
  Trash2,
  Download,
  Play,
  CheckCircle2,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { API_BASE } from '../apiConfig';

export default function TaxonomyStudio() {
  const [domains, setDomains] = useState([]);
  const [selectedDomainId, setSelectedDomainId] = useState('laptops_hardware');
  const [categories, setCategories] = useState([]);
  const [testText, setTestText] = useState(
    'The battery life lasts 12 hours and the OLED display is vibrant, but the cooling fan noise is annoying.'
  );
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // New category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatKeywords, setNewCatKeywords] = useState('');
  const [newCatColor, setNewCatColor] = useState('#38bdf8');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/taxonomy/domains`)
      .then((r) => r.json())
      .then((data) => {
        if (data.domains && data.domains.length > 0) {
          setDomains(data.domains);
          const found = data.domains.find((d) => d.domain_id === selectedDomainId) || data.domains[0];
          setCategories(found.categories || []);
        }
      })
      .catch((err) => console.warn('Failed to load taxonomy domains:', err));
  }, []);

  const handleSelectDomain = (domainId) => {
    setSelectedDomainId(domainId);
    const found = domains.find((d) => d.domain_id === domainId);
    if (found) {
      setCategories(found.categories || []);
      setTestResult(null);
    }
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const kws = newCatKeywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    const newCat = {
      category_id: `cat_${Date.now()}`,
      name: newCatName.trim(),
      description: 'Custom user-defined aspect category.',
      keywords: kws.length > 0 ? kws : [newCatName.trim().toLowerCase()],
      color: newCatColor
    };

    setCategories([...categories, newCat]);
    setNewCatName('');
    setNewCatKeywords('');
    setShowAddForm(false);
  };

  const handleDeleteCategory = (catId) => {
    setCategories(categories.filter((c) => c.category_id !== catId));
  };

  const handleTestTaxonomy = async () => {
    if (!testText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/taxonomy/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText.trim(),
          domain_id: selectedDomainId,
          custom_categories: categories
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
      } else {
        alert('Taxonomy mapping test failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error connecting to Taxonomy service.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(categories, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `SyntaxSense_Taxonomy_${selectedDomainId}.json`);
    dlAnchor.click();
  };

  return (
    <div className="page-content taxonomy-page">
      {/* Hero Header */}
      <section className="compare-hero taxonomy-hero">
        <div className="hero-pill">
          <FolderTree size={14} className="text-emerald" />
          <span>ENTERPRISE ONTOLOGY & CANONICAL TAXONOMY</span>
        </div>
        <h2 className="compare-title">
          Custom <em>Aspect Taxonomy Studio</em>
        </h2>
        <p className="compare-sub">
          Structure varied colloquial customer phrasing (e.g. <em>"screen"</em>, <em>"retina panel"</em>, <em>"OLED"</em>) into normalized enterprise aspect categories. Add custom dimensions, tune keyword dictionaries, and validate live aspect mapping.
        </p>

        {/* Domain Switcher */}
        <div className="preset-selector-row mt-4">
          <span className="preset-label">Domain Templates:</span>
          {domains.map((d) => (
            <button
              key={d.domain_id}
              className={`preset-btn ${selectedDomainId === d.domain_id ? 'active' : ''}`}
              onClick={() => handleSelectDomain(d.domain_id)}
            >
              <Tag size={14} />
              <span>{d.name}</span>
            </button>
          ))}
          <button className="preset-btn" onClick={handleExportJSON} title="Export Taxonomy to JSON">
            <Download size={14} />
            <span>Export JSON Rules</span>
          </button>
        </div>
      </section>

      {/* Category Manager Section */}
      <section className="panel-card mt-6">
        <div className="panel-header">
          <div>
            <span className="panel-pre-title">ONTOLOGY CONFIGURATION</span>
            <h3 className="panel-title">{categories.length} Active Aspect Dimensions</h3>
          </div>
          <button
            className="btn-secondary btn-sm"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} />
            <span>{showAddForm ? 'Cancel' : 'Add Category'}</span>
          </button>
        </div>

        {/* Add Form Drawer */}
        {showAddForm && (
          <form className="add-category-form mt-4" onSubmit={handleAddCategory}>
            <div className="form-row">
              <input
                type="text"
                className="input-field"
                placeholder="Category Name (e.g. Acoustic Profile)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
              />
              <input
                type="text"
                className="input-field"
                placeholder="Synonyms / Keywords (comma separated)"
                value={newCatKeywords}
                onChange={(e) => setNewCatKeywords(e.target.value)}
              />
              <input
                type="color"
                className="color-picker-input"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                title="Category Accent Color"
              />
              <button type="submit" className="btn-primary btn-sm">
                Save Dimension
              </button>
            </div>
          </form>
        )}

        {/* Category Cards Grid */}
        <div className="category-cards-grid mt-4">
          {categories.map((cat) => (
            <div key={cat.category_id} className="cat-card" style={{ borderLeft: `3px solid ${cat.color}` }}>
              <div className="cat-card-header">
                <span className="cat-name" style={{ color: cat.color }}>
                  {cat.name}
                </span>
                <button
                  className="btn-icon-subtle"
                  onClick={() => handleDeleteCategory(cat.category_id)}
                  title="Remove Category"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="cat-desc">{cat.description}</p>
              <div className="cat-keywords-wrap">
                {cat.keywords.map((kw, i) => (
                  <span key={i} className="kw-pill">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Aspect Mapping Sandbox */}
      <section className="panel-card mt-6">
        <div className="panel-header">
          <div>
            <span className="panel-pre-title">LIVE VALIDATION BENCH</span>
            <h3 className="panel-title">Test Review Aspect Mapping</h3>
          </div>
          <button
            className="btn-primary"
            onClick={handleTestTaxonomy}
            disabled={loading || !testText.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {loading ? <span className="spinner-border" /> : <Play size={16} />}
            <span>{loading ? 'Mapping Aspects...' : 'Test Mapping Rules'}</span>
          </button>
        </div>

        <textarea
          className="compare-textarea"
          rows={3}
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="Paste review to test against active aspect categories..."
        />

        {testResult && (
          <div className="taxonomy-results-box mt-4">
            <span className="tr-header">Mapped Categorical Alignments:</span>
            <div className="matches-row mt-2">
              {testResult.matches.map((m, idx) => (
                <div key={idx} className="match-pill" style={{ borderColor: m.category_color }}>
                  <span className="mp-aspect">{m.extracted_aspect}</span>
                  <span className="mp-arrow">➔</span>
                  <span className="mp-cat" style={{ color: m.category_color }}>
                    {m.matched_category}
                  </span>
                  <small className="mp-meta">via '{m.matched_by_keyword}'</small>
                </div>
              ))}
            </div>

            {testResult.unmapped_aspects.length > 0 && (
              <div className="unmapped-row mt-4">
                <span className="text-dim" style={{ fontSize: '0.8rem', marginRight: '8px' }}>
                  Unmapped Aspects:
                </span>
                {testResult.unmapped_aspects.map((u, i) => (
                  <span key={i} className="unmapped-pill">
                    ? {u}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
