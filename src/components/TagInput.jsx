import { useState } from 'react'
import { MAX_TAGS } from '../utils.js'
import { useI18n } from '../i18n.jsx'

export default function TagInput({ tags, onChange }) {
  const { t } = useI18n()
  const [value, setValue] = useState('')
  const full = tags.length >= MAX_TAGS

  const add = () => {
    const v = value.trim()
    if (!v || full) return
    if (tags.some((x) => x.toLowerCase() === v.toLowerCase())) { setValue(''); return }
    onChange([...tags, v])
    setValue('')
  }

  return (
    <div>
      <div className="tags editable">
        {tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== tag))} aria-label={t('tag_remove', { t: tag })}>×</button>
          </span>
        ))}
      </div>
      <div className="inline">
        <input
          value={value}
          disabled={full}
          maxLength={24}
          placeholder={full ? t('tag_full') : t('tag_ph')}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
        />
        <button type="button" className="btn" onClick={add} disabled={full || !value.trim()}>{t('tag_add')}</button>
      </div>
      <small className="muted">{t('tag_count', { n: tags.length, max: MAX_TAGS })}</small>
    </div>
  )
}
