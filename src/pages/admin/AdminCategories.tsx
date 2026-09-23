import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { getData } from '../../lib/data';
import type { Category } from '../../lib/types';
import { MEASUREMENT_TEMPLATES } from '../../lib/measurements';

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    getData().then((d) => d.listCategories()).then(setCategories);
  }, []);

  const update = async (category: Category, patch: Partial<Category>) => {
    const next = { ...category, ...patch };
    setCategories((cs) => cs.map((c) => (c.id === category.id ? next : c)));
    const data = await getData();
    await data.adminSaveCategory(next);
    setSaved(category.id);
    setTimeout(() => setSaved(null), 1500);
  };

  const add = async () => {
    const category: Category = {
      id: `cat-${Date.now().toString(36)}`,
      slug: 'new-category',
      name: 'New category',
      description: '',
      measurementTemplateId: MEASUREMENT_TEMPLATES[0].id,
      position: categories.length + 1,
    };
    const data = await getData();
    await data.adminSaveCategory(category);
    setCategories((cs) => [...cs, category]);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Categories</h1>
        <button type="button" onClick={add} className="btn-primary py-2 text-xs">
          <Plus size={15} /> Add
        </button>
      </div>
      <p className="mt-1 text-sm text-ink-400">
        Each category decides which measurements a customer is asked for. A bridal gown
        needs more than a shawl does.
      </p>

      <div className="mt-8 space-y-4">
        {categories.map((category) => (
          <section key={category.id} className="card p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor={`${category.id}-name`}>Name</label>
                <input
                  id={`${category.id}-name`}
                  defaultValue={category.name}
                  onBlur={(e) => update(category, {
                    name: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                  })}
                  className="field"
                />
              </div>

              <div>
                <label className="field-label" htmlFor={`${category.id}-template`}>
                  Measurements needed
                </label>
                <select
                  id={`${category.id}-template`}
                  value={category.measurementTemplateId}
                  onChange={(e) => update(category, { measurementTemplateId: e.target.value })}
                  className="field"
                >
                  {MEASUREMENT_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.fields.length} measurements)
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="field-label" htmlFor={`${category.id}-desc`}>Description</label>
                <input
                  id={`${category.id}-desc`}
                  defaultValue={category.description}
                  onBlur={(e) => update(category, { description: e.target.value })}
                  className="field"
                  placeholder="Shown at the top of the category page"
                />
              </div>
            </div>

            {saved === category.id && (
              <p className="mt-3 text-xs text-sage-500">Saved</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
