import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Send,
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  createQuestion,
  generateQuestionDraftCoach,
} from '../../services/questions/question.service.js';
import styles from './PostQuestion.module.css';

export default function PostQuestion() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // AI Draft Coach state
  const [isCoaching, setIsCoaching] = useState(false);
  const [coachTips, setCoachTips] = useState(null);
  const [coachError, setCoachError] = useState(null);

  // Success state
  const [publishedQuestion, setPublishedQuestion] = useState(null);

  const textareaRef = useRef(null);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field-specific validation error
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const insertFormatting = (prefix, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content.substring(start, end) || 'code';
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newContent =
      formData.content.substring(0, start) +
      replacement +
      formData.content.substring(end);

    setFormData(prev => ({ ...prev, content: newContent }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length,
      );
    }, 0);
  };

  const handleAiCoach = async () => {
    setCoachError(null);
    setCoachTips(null);

    if (formData.content.trim().length < 5) {
      setCoachError('Please write at least a few words in the body before asking for AI coaching.');
      return;
    }

    setIsCoaching(true);
    try {
      const response = await generateQuestionDraftCoach({
        title: formData.title.trim(),
        content: formData.content.trim(),
      });
      if (response?.data?.tips && response.data.tips.length > 0) {
        setCoachTips(response.data.tips);
      } else {
        setCoachTips(['Your draft looks good! Make sure to review for clarity and formatting.']);
      }
    } catch (err) {
      console.error('Draft coach error:', err);
      setCoachError('Could not reach the AI Coach right now. You can still post your question.');
    } finally {
      setIsCoaching(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitError(null);

    const errors = {};
    const trimmedTitle = formData.title.trim();
    const trimmedContent = formData.content.trim();

    if (!trimmedTitle) {
      errors.title = 'Title is required.';
    } else if (trimmedTitle.length < 5) {
      errors.title = 'Title must be at least 5 characters.';
    } else if (trimmedTitle.length > 255) {
      errors.title = 'Title must not exceed 255 characters.';
    }

    if (!trimmedContent) {
      errors.content = 'Content is required.';
    } else if (trimmedContent.length < 10) {
      errors.content = 'Content must be at least 10 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createQuestion({
        title: trimmedTitle,
        content: trimmedContent,
      });

      setPublishedQuestion(response.data);
    } catch (err) {
      console.error('Create question error:', err);
      setSubmitError(
        err.response?.data?.msg ||
          err.response?.data?.message ||
          'Failed to publish question. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFormData({ title: '', content: '' });
    setCoachTips(null);
    setCoachError(null);
    setValidationErrors({});
    setSubmitError(null);
    setPublishedQuestion(null);
  };

  // If question was just published, display success screen
  if (publishedQuestion) {
    return (
      <div className={styles.postPage}>
        <div className={styles.headerArea}>
          <span className={styles.headerArea__badge}>ASK THE COHORT</span>
          <h1 className={styles.headerArea__title}>Publish to the forum</h1>
          <p className={styles.headerArea__subtitle}>
            Public threads help the whole cohort. Write as if a classmate will
            debug your issue tomorrow. They only know what you put on the page.
          </p>
        </div>

        <div className={styles.successCard}>
          <div className={styles.successCard__iconWrap}>
            <CheckCircle size={36} className={styles.successCard__icon} />
          </div>
          <h2 className={styles.successCard__title}>Thread published</h2>
          <p className={styles.successCard__desc}>
            Your post is indexed for keyword search and embedding-based
            similarity. Share the link in study groups, or stay on the thread to
            answer follow-up questions from peers.
          </p>
          <div className={styles.successCard__actions}>
            <button
              type='button'
              onClick={() => navigate('/dashboard')}
              className={styles.buttonGhost}
            >
              Back to Dashboard
            </button>
            <button
              type='button'
              onClick={() =>
                navigate(`/questions/${publishedQuestion.questionHash}`)
              }
              className={styles.buttonPrimary}
            >
              View Question
            </button>
            <button
              type='button'
              onClick={handleResetForm}
              className={styles.buttonSecondary}
            >
              Ask Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.postPage}>
      {/* Header Area */}
      <div className={styles.headerArea}>
        <span className={styles.headerArea__badge}>ASK THE COHORT</span>
        <h1 className={styles.headerArea__title}>Publish to the forum</h1>
        <p className={styles.headerArea__subtitle}>
          Public threads help the whole cohort. Write as if a classmate will
          debug your issue tomorrow. They only know what you put on the page.
        </p>
      </div>

      {/* Checklist Guidelines Callout */}
      <div className={styles.checklistCard}>
        <h3 className={styles.checklistCard__heading}>
          Write questions people can answer in one pass
        </h3>
        <p className={styles.checklistCard__lead}>
          Mentors volunteer their time. Give them runnable context, expected vs
          actual behavior, and a tight scope so they can reproduce the issue
          without guessing your setup.
        </p>

        <div className={styles.checklistCard__section}>
          <h4 className={styles.checklistCard__subheading}>
            Checklist before you post
          </h4>
          <ul className={styles.checklistCard__list}>
            <li>
              <strong>Title as a headline</strong> that states the symptom and
              tech stack (e.g., &quot;React 19: state resets after navigation&quot;).
            </li>
            <li>
              <strong>Repro steps</strong> numbered, with environment (OS,
              browser, Node version) when it matters.
            </li>
            <li>
              <strong>Minimal code</strong> in fenced markdown blocks; trim
              unrelated lines so readers scan faster.
            </li>
            <li>
              <strong>Exact errors</strong> copied verbatim, including stack
              trace snippets when debugging backend routes.
            </li>
          </ul>
        </div>

        <div className={styles.checklistCard__section}>
          <h4 className={styles.checklistCard__subheading}>
            Validation rules (enforced by the form)
          </h4>
          <ul className={styles.checklistCard__list}>
            <li>
              <strong>Title length:</strong> Must be between 5 and 255
              characters.
            </li>
            <li>
              <strong>Body length:</strong> Must contain a minimum of 10
              characters detailing your problem.
            </li>
            <li>
              <strong>Single topic:</strong> Split unrelated bugs into separate
              threads so search and embeddings stay precise.
            </li>
          </ul>
        </div>
      </div>

      {/* Main Post Form Card */}
      <form onSubmit={handleSubmit} className={styles.formCard}>
        {submitError && (
          <div className={styles.errorAlert}>
            <AlertCircle size={18} />
            <span>{submitError}</span>
          </div>
        )}

        {/* Title Field */}
        <div className={styles.fieldGroup}>
          <label htmlFor='title' className={styles.fieldLabel}>
            Title
          </label>
          <span className={styles.fieldHelper}>
            Be specific and imagine you&apos;re asking a question to another person.
          </span>
          <input
            id='title'
            name='title'
            type='text'
            value={formData.title}
            onChange={handleInputChange}
            placeholder='e.g. How do I handle state management using Context API in React?'
            className={`${styles.input} ${
              validationErrors.title ? styles['input--error'] : ''
            }`}
            disabled={isSubmitting}
          />
          {validationErrors.title && (
            <span className={styles.errorText}>{validationErrors.title}</span>
          )}
        </div>

        {/* Content Details Field */}
        <div className={styles.fieldGroup}>
          <label htmlFor='content' className={styles.fieldLabel}>
            What are the details of your problem?
          </label>
          <span className={styles.fieldHelper}>
            Introduce the problem and expand on what you put in the title. Minimum
            10 characters.
          </span>

          <div className={styles.editorContainer}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
              <div className={styles.toolbar__buttons}>
                <button
                  type='button'
                  onClick={() => insertFormatting('**', '**')}
                  className={styles.toolbar__btn}
                  title='Bold'
                >
                  <Bold size={14} />
                </button>
                <button
                  type='button'
                  onClick={() => insertFormatting('*', '*')}
                  className={styles.toolbar__btn}
                  title='Italic'
                >
                  <Italic size={14} />
                </button>
                <button
                  type='button'
                  onClick={() => insertFormatting('```\n', '\n```')}
                  className={styles.toolbar__btn}
                  title='Code Block'
                >
                  <Code size={14} />
                </button>
                <button
                  type='button'
                  onClick={() => insertFormatting('[', '](url)')}
                  className={styles.toolbar__btn}
                  title='Link'
                >
                  <LinkIcon size={14} />
                </button>
              </div>
              <span className={styles.charCount}>
                {formData.content.length} characters
              </span>
            </div>

            <textarea
              id='content'
              ref={textareaRef}
              name='content'
              rows={12}
              value={formData.content}
              onChange={handleInputChange}
              placeholder='Include all the information someone would need to answer your question... You can use Markdown to format your code!'
              className={`${styles.textarea} ${
                validationErrors.content ? styles['textarea--error'] : ''
              }`}
              disabled={isSubmitting}
            />
          </div>
          {validationErrors.content && (
            <span className={styles.errorText}>{validationErrors.content}</span>
          )}
        </div>

        {/* AI Suggestions Toolbar */}
        <div className={styles.aiCoachRow}>
          <button
            type='button'
            onClick={handleAiCoach}
            disabled={isCoaching || isSubmitting}
            className={styles.aiCoachBtn}
          >
            <Sparkles size={16} />
            <span>{isCoaching ? 'Consulting AI...' : 'AI suggestions'}</span>
          </button>
          <span className={styles.aiCoachHelp}>
            Suggestions only. You still choose what to post.
          </span>
        </div>

        {/* AI Feedback Panel */}
        {coachError && (
          <div className={styles.coachError}>
            <AlertCircle size={15} />
            <span>{coachError}</span>
          </div>
        )}

        {coachTips && (
          <div className={styles.coachPanel}>
            <div className={styles.coachPanel__header}>
              <Sparkles size={16} className={styles.coachPanel__icon} />
              <h4 className={styles.coachPanel__title}>AI Draft Coach Tips</h4>
            </div>
            <ul className={styles.coachPanel__list}>
              {coachTips.map((tip, idx) => (
                <li key={idx} className={styles.coachPanel__item}>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Form Actions */}
        <div className={styles.formActions}>
          <button
            type='button'
            onClick={() => navigate('/dashboard')}
            disabled={isSubmitting}
            className={styles.buttonCancel}
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={isSubmitting}
            className={styles.buttonSubmit}
          >
            <span>{isSubmitting ? 'Posting...' : 'Post Question'}</span>
            <Send size={15} />
          </button>
        </div>
      </form>
    </div>
  );
}
