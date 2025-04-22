import { Component } from '@angular/core';

@Component({
  selector: 'app-clementine',
  templateUrl: './clementine.component.html',
  styleUrls: ['./clementine.component.css']
})
export class ClementineComponent {
  

  started = false;
  isComplete = false;
  score = 0;
  currentCalculationIndex = 0;
  userAnswer: number | null = null;
  calculations: { question: string, answer: number }[] = [];
  text() {
    window.confirm("aimes tu clémentine ?");
  }


  startCalculations() {
    this.started = true;
    this.isComplete = false;
    this.score = 0;
    this.currentCalculationIndex = 0;
    this.calculations = this.generateCalculations();
  }

  generateCalculations() {
    const calcArray = [];
    for (let i = 0; i < 10; i++) {
      const type = Math.floor(Math.random() * 3); // 0: addition, 1: soustraction, 2: multiplication
      let question = '';
      let answer = 0;

      if (type === 0) { // Addition
        const a = this.randomNumber(1, 500);
        const b = this.randomNumber(1, 500 - a);
        question = `${a} + ${b}`;
        answer = a + b;
      } else if (type === 1) { // Soustraction
        const b = this.randomNumber(1, 70);
        const a = b +this.randomNumber(0, 430);
        question = `${a} - ${b}`;
        answer = a - b;
      } else if (type === 2) { // Multiplication
        const a = this.randomNumber(1, 9);
        const b = this.randomNumber(1, 9);
        question = `${a} * ${b}`;
        answer = a * b;
      }
      calcArray.push({ question, answer });
    }
    return calcArray;
  }

  submitAnswer() {
    if (this.userAnswer === this.currentCalculation.answer) {
      this.score++;
    }

    this.currentCalculationIndex++;
    this.userAnswer = null;

    if (this.currentCalculationIndex === 10) {
      this.isComplete = true;
    }
  }

  restart() {
    this.startCalculations();
  }

  get currentCalculation() {
    return this.calculations[this.currentCalculationIndex];
  }

  randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
