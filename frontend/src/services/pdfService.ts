/**
 * PDF Generation Service for Step Work Documents
 * 
 * Generates downloadable, printable AA step work documents
 * Maintains complete anonymity and privacy
 */

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { StepWorkDocument, ResentmentInventory, FearInventory, AmendsItem } from '@/types'

export class StepWorkPDFService {
  private doc: jsPDF

  constructor() {
    this.doc = new jsPDF()
  }

  /**
   * Generate PDF for any step work document
   */
  async generateStepWorkPDF(stepWork: StepWorkDocument): Promise<Blob> {
    this.doc = new jsPDF()
    
    // Add header
    this.addHeader(stepWork.title, stepWork.stepNumber)
    
    // Add date and privacy notice
    this.addPrivacyNotice()
    
    // Add content based on step number
    switch (stepWork.stepNumber) {
      case 1:
        await this.addStep1Content(stepWork)
        break
      case 2:
        await this.addStep2Content(stepWork)
        break
      case 3:
        await this.addStep3Content(stepWork)
        break
      case 4:
        await this.addStep4Content(stepWork)
        break
      case 8:
        await this.addStep8Content(stepWork)
        break
      case 9:
        await this.addStep9Content(stepWork)
        break
      default:
        await this.addGenericStepContent(stepWork)
    }

    // Add footer
    this.addFooter()

    return this.doc.output('blob')
  }

  /**
   * Generate 4th Step inventory PDF
   */
  async generateFourthStepPDF(
    resentments: ResentmentInventory[],
    fears: FearInventory[]
  ): Promise<Blob> {
    this.doc = new jsPDF()
    
    this.addHeader('Fourth Step Inventory', 4)
    this.addPrivacyNotice()
    
    // Add Big Book reference
    this.doc.setFontSize(10)
    this.doc.text('Reference: Alcoholics Anonymous (Big Book) - Pages 64-71', 14, 40)
    this.doc.text('"Made a searching and fearless moral inventory of ourselves."', 14, 47)
    
    let yPosition = 60

    // Resentment Inventory
    if (resentments.length > 0) {
      yPosition = this.addResentmentTable(resentments, yPosition)
    }

    // Fear Inventory  
    if (fears.length > 0) {
      yPosition = this.addFearTable(fears, yPosition)
    }

    this.addFooter()
    return this.doc.output('blob')
  }

  /**
   * Generate amends list PDF
   */
  async generateAmendsListPDF(amends: AmendsItem[]): Promise<Blob> {
    this.doc = new jsPDF()
    
    this.addHeader('Steps 8 & 9 - Amends List', 8)
    this.addPrivacyNotice()
    
    this.doc.setFontSize(10)
    this.doc.text('Step 8: "Made a list of all persons we had harmed..."', 14, 40)
    this.doc.text('Step 9: "Made direct amends to such people wherever possible..."', 14, 47)
    this.doc.text('⚠️ Always consult with your sponsor before making amends', 14, 54)
    
    this.addAmendsTable(amends, 70)
    this.addFooter()
    
    return this.doc.output('blob')
  }

  private addHeader(title: string, stepNumber: number): void {
    // Title
    this.doc.setFontSize(18)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(`AA Step ${stepNumber}`, 14, 20)
    
    this.doc.setFontSize(14)
    this.doc.text(title, 14, 30)
    
    // Line under header
    this.doc.setLineWidth(0.5)
    this.doc.line(14, 32, 196, 32)
  }

  private addPrivacyNotice(): void {
    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'italic')
    this.doc.text('🔒 This document is completely private and anonymous', 14, 280)
    this.doc.text('🤝 AA Traditions compliant - Your recovery, your privacy', 14, 285)
    this.doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 280)
  }

  private addFooter(): void {
    const pageCount = this.doc.getNumberOfPages()
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      this.doc.setFontSize(8)
      this.doc.text(`Page ${i} of ${pageCount}`, 180, 290)
      this.doc.text('Digital Sponsor - AA Literature Companion', 14, 290)
    }
  }

  private async addStep1Content(stepWork: StepWorkDocument): Promise<void> {
    let yPos = 50
    
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Examples of Powerlessness Over Alcohol:', 14, yPos)
    yPos += 10
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(10)
    
    // Add content from stepWork.content
    if (stepWork.content.sections) {
      stepWork.content.sections.forEach(section => {
        if (yPos > 250) {
          this.doc.addPage()
          yPos = 20
        }
        
        this.doc.setFont('helvetica', 'bold')
        this.doc.text(section.title, 14, yPos)
        yPos += 8
        
        this.doc.setFont('helvetica', 'normal')
        if (section.content) {
          const lines = this.doc.splitTextToSize(section.content, 170)
          this.doc.text(lines, 20, yPos)
          yPos += lines.length * 5 + 5
        }
      })
    }
  }

  private async addStep2Content(stepWork: StepWorkDocument): Promise<void> {
    let yPos = 50
    
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Coming to Believe:', 14, yPos)
    yPos += 15
    
    this.doc.setFontSize(10)
    this.doc.text('Understanding of Higher Power:', 14, yPos)
    yPos += 10
    
    // Add sections content similar to Step 1
    this.addSectionContent(stepWork, yPos)
  }

  private async addStep3Content(stepWork: StepWorkDocument): Promise<void> {
    let yPos = 50
    
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Decision to Turn Will and Life Over:', 14, yPos)
    yPos += 15
    
    this.addSectionContent(stepWork, yPos)
  }

  private async addStep4Content(stepWork: StepWorkDocument): Promise<void> {
    let yPos = 50
    
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Searching and Fearless Moral Inventory:', 14, yPos)
    yPos += 15
    
    this.doc.setFontSize(10)
    this.doc.text('Use the detailed 4th Step inventory forms for complete inventory.', 14, yPos)
    yPos += 10
    
    this.addSectionContent(stepWork, yPos)
  }

  private async addStep8Content(stepWork: StepWorkDocument): Promise<void> {
    let yPos = 50
    
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('List of People We Had Harmed:', 14, yPos)
    yPos += 15
    
    this.addSectionContent(stepWork, yPos)
  }

  private async addStep9Content(stepWork: StepWorkDocument): Promise<void> {
    let yPos = 50
    
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Making Direct Amends:', 14, yPos)
    yPos += 15
    
    this.addSectionContent(stepWork, yPos)
  }

  private async addGenericStepContent(stepWork: StepWorkDocument): Promise<void> {
    this.addSectionContent(stepWork, 50)
  }

  private addSectionContent(stepWork: StepWorkDocument, startY: number): void {
    let yPos = startY
    
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    
    if (stepWork.content.sections) {
      stepWork.content.sections.forEach(section => {
        if (yPos > 250) {
          this.doc.addPage()
          yPos = 20
        }
        
        this.doc.setFont('helvetica', 'bold')
        this.doc.text(section.title, 14, yPos)
        yPos += 8
        
        this.doc.setFont('helvetica', 'normal')
        if (section.content) {
          const lines = this.doc.splitTextToSize(section.content, 170)
          this.doc.text(lines, 20, yPos)
          yPos += lines.length * 5 + 10
        }
      })
    }
  }

  private addResentmentTable(resentments: ResentmentInventory[], startY: number): number {
    let yPos = startY
    
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Resentment Inventory', 14, yPos)
    yPos += 15
    
    // Table headers
    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Person/Institution', 14, yPos)
    this.doc.text('The Cause', 60, yPos)
    this.doc.text('Affects My', 110, yPos)
    this.doc.text('My Part', 150, yPos)
    this.doc.text('Character Defect', 180, yPos)
    yPos += 8
    
    // Draw header line
    this.doc.line(14, yPos - 2, 196, yPos - 2)
    
    this.doc.setFont('helvetica', 'normal')
    
    resentments.forEach(resentment => {
      if (yPos > 250) {
        this.doc.addPage()
        yPos = 20
      }
      
      // Truncate long text to fit columns
      const person = this.truncateText(resentment.person, 40)
      const cause = this.truncateText(resentment.cause, 40)
      const affects = this.getAffectsText(resentment.affects)
      const myPart = this.truncateText(resentment.myPart, 25)
      const defect = this.truncateText(resentment.characterDefect, 20)
      
      this.doc.text(person, 14, yPos)
      this.doc.text(cause, 60, yPos)
      this.doc.text(affects, 110, yPos)
      this.doc.text(myPart, 150, yPos)
      this.doc.text(defect, 180, yPos)
      
      yPos += 8
    })
    
    return yPos + 15
  }

  private addFearTable(fears: FearInventory[], startY: number): number {
    let yPos = startY
    
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Fear Inventory', 14, yPos)
    yPos += 15
    
    // Table headers
    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Fear', 14, yPos)
    this.doc.text('Why', 80, yPos)
    this.doc.text('Affects My', 140, yPos)
    yPos += 8
    
    this.doc.line(14, yPos - 2, 196, yPos - 2)
    this.doc.setFont('helvetica', 'normal')
    
    fears.forEach(fear => {
      if (yPos > 250) {
        this.doc.addPage()
        yPos = 20
      }
      
      const fearText = this.truncateText(fear.fear, 50)
      const cause = this.truncateText(fear.cause, 50)
      const affects = this.getAffectsText(fear.affects)
      
      this.doc.text(fearText, 14, yPos)
      this.doc.text(cause, 80, yPos)
      this.doc.text(affects, 140, yPos)
      
      yPos += 8
    })
    
    return yPos + 15
  }

  private addAmendsTable(amends: AmendsItem[], startY: number): number {
    let yPos = startY
    
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Amends List', 14, yPos)
    yPos += 15
    
    // Table headers
    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Person', 14, yPos)
    this.doc.text('Harm', 60, yPos)
    this.doc.text('Willingness', 120, yPos)
    this.doc.text('Method/Timing', 160, yPos)
    yPos += 8
    
    this.doc.line(14, yPos - 2, 196, yPos - 2)
    this.doc.setFont('helvetica', 'normal')
    
    amends.forEach(amend => {
      if (yPos > 250) {
        this.doc.addPage()
        yPos = 20
      }
      
      const person = this.truncateText(amend.person, 35)
      const harm = this.truncateText(amend.harm, 45)
      const willingness = amend.willingness.replace('_', ' ')
      const method = this.truncateText(amend.method || '', 30)
      
      this.doc.text(person, 14, yPos)
      this.doc.text(harm, 60, yPos)
      this.doc.text(willingness, 120, yPos)
      this.doc.text(method, 160, yPos)
      
      yPos += 8
    })
    
    return yPos + 15
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + '...'
  }

  private getAffectsText(affects: any): string {
    const affectedAreas = []
    if (affects.selfEsteem) affectedAreas.push('SE')
    if (affects.pride) affectedAreas.push('P')
    if (affects.personalRelations) affectedAreas.push('PR')
    if (affects.sexRelations) affectedAreas.push('SR')
    if (affects.security) affectedAreas.push('S')
    if (affects.ambitions) affectedAreas.push('A')
    if (affects.pocketbook) affectedAreas.push('PB')
    
    return affectedAreas.join(', ')
  }

  /**
   * Download PDF file
   */
  static downloadPDF(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

export default StepWorkPDFService