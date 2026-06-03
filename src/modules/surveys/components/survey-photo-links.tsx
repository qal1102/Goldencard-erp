import { isLikelyUrl, parseSurveyPhotoLinks } from '../lib/survey-photo-links';

type Props = {
  value: string;
  className?: string;
};

export function SurveyPhotoLinks({ value, className }: Props) {
  const links = parseSurveyPhotoLinks(value);
  if (links.length === 0) return null;

  return (
    <ul className={className ?? 'flex min-w-0 flex-col gap-1.5'}>
      {links.map((link, index) => (
        <li key={`${index}-${link}`} className="min-w-0 text-sm">
          {isLikelyUrl(link) ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="break-words text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {link}
            </a>
          ) : (
            <span className="break-words text-foreground">{link}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
