import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LanguageToggle({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = (i18n.language || 'id').startsWith('en') ? 'en' : 'id';
  const setLang = (lng: 'id' | 'en') => i18n.changeLanguage(lng);

  return (
    <div className={cn('inline-flex items-center gap-1 rounded-md border bg-background p-0.5 text-xs', className)}>
      <Languages className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
      <button
        type="button"
        onClick={() => setLang('id')}
        className={cn(
          'rounded px-2 py-0.5 font-medium transition-colors',
          current === 'id' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        )}
        aria-pressed={current === 'id'}
      >
        ID
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={cn(
          'rounded px-2 py-0.5 font-medium transition-colors',
          current === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        )}
        aria-pressed={current === 'en'}
      >
        EN
      </button>
    </div>
  );
}
