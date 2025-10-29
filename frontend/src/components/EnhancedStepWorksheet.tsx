import React, { useState, useEffect, useRef } from 'react'
import type { Session } from '@/types'
import './EnhancedStepWorksheet.css'

interface StepWorksheetProps {
  stepNumber: number
  isOnline: boolean
  session: Session | null
  onSave?: (content: string) => void
  initialContent?: string
}

interface StepGuide {
  number: number
  title: string
  text: string
  prayer?: string
  instructions: string[]
  reflectionQuestions: string[]
  bigBookPages?: string
}

const STEP_GUIDES: Record<number, StepGuide> = {
  1: {
    number: 1,
    title: "We admitted we were powerless over alcohol—that our lives had become unmanageable.",
    text: "We admitted we were powerless over alcohol—that our lives had become unmanageable.",
    prayer: "God, I admit that I am powerless over alcohol and that my life has become unmanageable. I need Your help.",
    instructions: [
      "Write about specific examples of powerlessness over alcohol",
      "List ways your life became unmanageable",
      "Reflect on attempts to control your drinking that failed",
      "Describe the consequences of your drinking"
    ],
    reflectionQuestions: [
      "When did you first realize you couldn't control your drinking?",
      "What are specific examples of unmanageability in your life?",
      "How did drinking affect your relationships, work, and health?",
      "What happened when you tried to quit or control your drinking on your own?"
    ],
    bigBookPages: "Pages 21-24"
  },
  2: {
    number: 2,
    title: "Came to believe that a Power greater than ourselves could restore us to sanity.",
    text: "Came to believe that a Power greater than ourselves could restore us to sanity.",
    prayer: "God, I came to believe that You, a Power greater than myself, can restore me to sanity. Help me to believe.",
    instructions: [
      "Explore your understanding of a Higher Power",
      "Write about moments of clarity or hope",
      "Reflect on evidence of insanity in your drinking",
      "Consider how others have found recovery"
    ],
    reflectionQuestions: [
      "What does 'Power greater than ourselves' mean to you?",
      "How was your drinking behavior insane or irrational?",
      "What evidence do you see that recovery is possible?",
      "How has your concept of God or Higher Power changed?"
    ],
    bigBookPages: "Pages 25-33"
  },
  3: {
    number: 3,
    title: "Made a decision to turn our will and our lives over to the care of God as we understood Him.",
    text: "Made a decision to turn our will and our lives over to the care of God as we understood Him.",
    prayer: "God, I offer myself to Thee—to build with me and to do with me as Thou wilt. Relieve me of the bondage of self, that I may better do Thy will. Take away my difficulties, that victory over them may bear witness to those I would help of Thy Power, Thy Love, and Thy Way of life. May I do Thy will always!",
    instructions: [
      "Write about your decision to surrender control",
      "Explore what 'God as you understand Him' means",
      "Reflect on areas where self-will has caused problems",
      "Commit to following spiritual guidance"
    ],
    reflectionQuestions: [
      "What does it mean to turn your will over to God?",
      "What areas of your life are you still trying to control?",
      "How has self-will gotten you into trouble?",
      "What does surrender mean to you?"
    ],
    bigBookPages: "Pages 34-43, 60-63"
  },
  4: {
    number: 4,
    title: "Made a searching and fearless moral inventory of ourselves.",
    text: "Made a searching and fearless moral inventory of ourselves.",
    prayer: "Dear God, it is I who has made my life a mess. I have done it, but I cannot undo it. My mistakes are mine, and I will begin a searching and fearless moral inventory. I will write down my wrongs, but I will also include that which is good. I pray for the strength to complete this inventory, and the courage to move on to the next step.",
    instructions: [
      "Create a resentment inventory (person, cause, affects)",
      "Create a fear inventory (what you fear, why)",
      "Create a sex conduct inventory (harm to others)",
      "Include positive qualities and accomplishments",
      "Be thorough, honest, and without judgment"
    ],
    reflectionQuestions: [
      "Who or what do you resent and why?",
      "What fears control your life?",
      "How has your sexual conduct hurt others?",
      "What patterns do you see in your character defects?",
      "What are your positive qualities and strengths?"
    ],
    bigBookPages: "Pages 64-71"
  },
  5: {
    number: 5,
    title: "Admitted to God, to ourselves, and to another human being the exact nature of our wrongs.",
    text: "Admitted to God, to ourselves, and to another human being the exact nature of our wrongs.",
    prayer: "Higher Power, I have completed my moral inventory, and now I admit to You, to myself, and to another human being the exact nature of my wrongs. Give me strength and courage for this step.",
    instructions: [
      "Choose someone trustworthy to share with (sponsor, clergy, friend)",
      "Review your Step 4 inventory thoroughly",
      "Share the exact nature of your wrongs, not just the facts",
      "Listen without defensiveness",
      "Be completely honest"
    ],
    reflectionQuestions: [
      "Who will you choose to share your inventory with?",
      "What fears do you have about this step?",
      "What patterns of wrongdoing do you see?",
      "How do you feel after completing this step?"
    ],
    bigBookPages: "Pages 72-75"
  },
  11: {
    number: 11,
    title: "Sought through prayer and meditation to improve our conscious contact with God as we understood Him, praying only for knowledge of His will for us and the power to carry that out.",
    text: "Sought through prayer and meditation to improve our conscious contact with God as we understood Him, praying only for knowledge of His will for us and the power to carry that out.",
    prayer: "God, I pray for knowledge of Your will for me and the power to carry it out. Help me to improve my conscious contact with You through prayer and meditation.",
    instructions: [
      "Establish a daily prayer and meditation practice",
      "Reflect on your spiritual growth",
      "Practice seeking God's will rather than your own",
      "Use morning meditation and evening reflection"
    ],
    reflectionQuestions: [
      "What does prayer mean to you?",
      "How do you practice meditation?",
      "How do you know God's will for you?",
      "What is your daily spiritual practice?"
    ],
    bigBookPages: "Pages 85-88"
  }
}

/**
 * Enhanced Step Worksheet Component
 * 
 * Provides a rich text editing experience similar to Google Docs
 * for working through AA steps with guidance, prayers, and instructions
 */
export default function EnhancedStepWorksheet({ 
  stepNumber, 
  isOnline, 
  session, 
  onSave,
  initialContent = ''
}: StepWorksheetProps): JSX.Element {
  const [content, setContent] = useState(initialContent)
  const [isEditing, setIsEditing] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [wordCount, setWordCount] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)

  const stepGuide = STEP_GUIDES[stepNumber]

  useEffect(() => {
    updateWordCount()
  }, [content])

  useEffect(() => {
    // Auto-save after 2 seconds of no typing
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }

    const timeout = setTimeout(() => {
      if (content && onSave) {
        onSave(content)
        setLastSaved(new Date())
      }
    }, 2000)

    setAutoSaveTimeout(timeout)

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [content, onSave])

  const updateWordCount = () => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0)
    setWordCount(words.length)
  }

  const handleContentChange = () => {
    if (contentRef.current) {
      const newContent = contentRef.current.innerHTML
      setContent(newContent)
    }
  }

  const handleFocus = () => {
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    handleContentChange()
  }

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    contentRef.current?.focus()
  }

  const insertText = (text: string) => {
    if (contentRef.current) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(document.createTextNode(text))
        range.collapse(false)
        selection.removeAllRanges()
        selection.addRange(range)
      }
      handleContentChange()
    }
  }

  const exportContent = () => {
    const element = document.createElement('div')
    element.innerHTML = `
      <h1>Step ${stepNumber} Worksheet</h1>
      <h2>${stepGuide?.title}</h2>
      ${stepGuide?.prayer ? `<h3>Step Prayer:</h3><p><em>${stepGuide.prayer}</em></p>` : ''}
      <h3>My Work:</h3>
      ${content}
    `
    
    const blob = new Blob([element.outerHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Step_${stepNumber}_Worksheet.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (!stepGuide) {
    return (
      <div className="step-worksheet">
        <div className="step-header">
          <h2>Step {stepNumber} Worksheet</h2>
          <p>This step is not yet available in the guided worksheet format.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="enhanced-step-worksheet" data-testid={`step-${stepNumber}-worksheet`}>
      {/* Step Header */}
      <div className="step-header">
        <div className="step-number">Step {stepNumber}</div>
        <h1 className="step-title">{stepGuide.title}</h1>
        {stepGuide.bigBookPages && (
          <div className="big-book-reference">
            📖 Big Book: {stepGuide.bigBookPages}
          </div>
        )}
      </div>

      {/* Step Prayer */}
      {stepGuide.prayer && (
        <div className="step-prayer">
          <h3>🙏 Step Prayer</h3>
          <blockquote>{stepGuide.prayer}</blockquote>
        </div>
      )}

      {/* Instructions */}
      <div className="step-instructions">
        <h3>📝 Instructions</h3>
        <ul>
          {stepGuide.instructions.map((instruction, index) => (
            <li key={index}>{instruction}</li>
          ))}
        </ul>
      </div>

      {/* Reflection Questions */}
      <div className="reflection-questions">
        <h3>💭 Reflection Questions</h3>
        <div className="questions-grid">
          {stepGuide.reflectionQuestions.map((question, index) => (
            <div key={index} className="question-card">
              <p><strong>Q{index + 1}:</strong> {question}</p>
              <button
                onClick={() => insertText(`\n\nQ${index + 1}: ${question}\n\nA: `)}
                className="add-question-btn"
                title="Add this question to your worksheet"
              >
                Add to Worksheet
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Editing Toolbar */}
      <div className="editing-toolbar">
        <div className="toolbar-section">
          <button onClick={() => formatText('bold')} title="Bold">
            <strong>B</strong>
          </button>
          <button onClick={() => formatText('italic')} title="Italic">
            <em>I</em>
          </button>
          <button onClick={() => formatText('underline')} title="Underline">
            <u>U</u>
          </button>
        </div>
        
        <div className="toolbar-section">
          <button onClick={() => formatText('insertUnorderedList')} title="Bullet List">
            • List
          </button>
          <button onClick={() => formatText('insertOrderedList')} title="Numbered List">
            1. List
          </button>
        </div>

        <div className="toolbar-section">
          <button onClick={exportContent} title="Export as HTML">
            📄 Export
          </button>
        </div>

        <div className="toolbar-status">
          {wordCount} words
          {lastSaved && (
            <span className="last-saved">
              • Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Rich Text Editor */}
      <div className="worksheet-editor">
        <div
          ref={contentRef}
          className={`content-editor ${isEditing ? 'editing' : ''}`}
          contentEditable
          onFocus={handleFocus}
          onBlur={handleBlur}
          onInput={handleContentChange}
          data-testid="step-content-editor"
          suppressContentEditableWarning={true}
          style={{ minHeight: '400px' }}
          dangerouslySetInnerHTML={{ __html: content || '<p>Click here to begin your step work...</p>' }}
        />
      </div>

      {/* Help Section */}
      <div className="worksheet-help">
        <details>
          <summary>💡 Tips for Step Work</summary>
          <div className="help-content">
            <ul>
              <li><strong>Be honest:</strong> This is for your recovery, not to impress anyone</li>
              <li><strong>Take your time:</strong> There's no rush - quality over speed</li>
              <li><strong>Use the prayer:</strong> Start each session with the step prayer</li>
              <li><strong>Ask for help:</strong> Discuss with your sponsor regularly</li>
              <li><strong>Stay private:</strong> Your work is saved locally only</li>
            </ul>
          </div>
        </details>
      </div>

      {/* Privacy Notice */}
      <div className="privacy-notice">
        🔒 <strong>Privacy Protected:</strong> Your step work is stored locally on your device only. 
        Nothing is sent to any server. Following AA Tradition 12 (anonymity).
      </div>
    </div>
  )
}