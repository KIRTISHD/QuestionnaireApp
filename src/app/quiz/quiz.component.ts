import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActualquizService } from '../services/actualquiz.service';
import { Question } from '../models/Question';
import { QuizResponse } from '../models/QuizResponse';
import { EachResponse } from '../models/EachResponse';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.css']
})
export class QuizComponent implements OnInit, OnDestroy {

  title = 'QuestionaireApp';
  questions: Question[] = [];
  ready = false;
  currentQuestion!: Question;
  response!: QuizResponse;
  tempAnswer!: string;
  ifSelectedAny = false;

  // page related
  timer: any = null;
  startTime!: Date;
  endTime!: Date;
  ellapsedTime = '00:00';
  duration = '';

  pager = {
    index: 0,
    count: 1
  };

  constructor(private quizService: ActualquizService,
              private router: Router,
              private userService: UserService) {

    const userdetails = JSON.parse(localStorage.getItem('userdetails') || '{}');
    localStorage.removeItem('userdetails');
    this.response = new QuizResponse(userdetails.quizid, userdetails.username);
    this.loadQuestions(userdetails.quizid);
  }
  ngOnInit(): void {
    window.addEventListener('keyup', disableF5);
    window.addEventListener('keydown', disableF5);

    function disableF5(e: any) {
      if ((e.which || e.keyCode) === 116) { e.preventDefault(); }
    }
  }

  @HostListener('unloaded')
  ngOnDestroy(): void {
    console.log('Quiz component Destroy');
  }

  loadQuestions(quizid: string) {
    this.quizService.getQuestionPerQuiz(quizid).subscribe(result => {
      result.quizes.forEach((element: any) => {
        this.questions.push(new Question(element._id, element.question, element.options, element.answer));
      });
      this.currentQuestion = this.questions[0];
      this.pager.count = result.quizes.length;
    },
      err => {
        console.log(err);
        if (err.status === 403) {
          console.log("403 error fetching questions");
        }
      },
      () => {
        this.ready = true;
        console.log('ready ' + ' quiz length- ' + this.pager.count);

        this.startTimerPerQuestion();

      });
  }

  startTimerPerQuestion() {
    this.startTime = new Date();
    this.endTime = new Date();
    this.endTime.setSeconds(this.endTime.getSeconds() + 10);
    this.ellapsedTime = '00:00';
    this.timer = setInterval(() => { this.tick(); }, 1000);
    this.duration = this.parseTime(10);
  }

  nextQuestion() {
    let finishQuiz = false;
    // if any option selected
    if (this.ifSelectedAny) {
      console.log('kuch to hua hai');
      // this.response.addResponse(new EachResponse(this.currentQuestion.id, this.tempAnswer, this.getTime(), true));
      this.response.EachResponses.push(new EachResponse(this.currentQuestion.id, this.tempAnswer, this.getTime(), true));
    } else {
      console.log('kuch nahi hua hai');
      // this.response.addResponse(new EachResponse(this.currentQuestion.id, '', this.getTime(), false));
      this.response.EachResponses.push(new EachResponse(this.currentQuestion.id, '', this.getTime(), false));
    }
    this.ifSelectedAny = false;

    this.pager.index++;
    if (this.pager.index === this.pager.count) {
      // this is when all questions end
      const str = JSON.stringify(this.response);
      console.log('All questions done ' + str);
      this.userService.registerResponse(this.response)
        .subscribe(res => {
          this.router.navigate(['/finish']);
          this.ngOnDestroy();
          finishQuiz = true;
        }, 
        err => {
          console.log("Error in registering response - " + err);
        });
    }

    if (!finishQuiz){
      this.currentQuestion = this.questions[this.pager.index];
      this.startTimerPerQuestion();
    }
  }

  parseTime(totalSeconds: number) {
    let mins: string | number = Math.floor(totalSeconds / 60);
    let secs: string | number = Math.round(totalSeconds % 60);
    mins = (mins < 10 ? '0' : '') + mins;
    secs = (secs < 10 ? '0' : '') + secs;
    return `${mins}:${secs}`;
  }

  getTime() {
    const timeArray = this.ellapsedTime.split(':');
    const min: number = +timeArray[0];
    const sec: number = +timeArray[1];
    const totalSec = 10 - (min * 60 + sec);
    console.log('time-' + totalSec);
    return totalSec;
  }

  tick() {
    const now = new Date();
    // const diff = (now.getTime() - this.startTime.getTime()) / 1000;
    const diff = (this.endTime.getTime() - now.getTime()) / 1000;
    if (diff < 0 && this.pager.index !== this.pager.count) {
      // this.onSubmit();
      console.log('QuizDone');
      this.nextQuestion();
    }
    this.ellapsedTime = this.parseTime(diff);
  }

  onSelect(option: any) {
    this.tempAnswer = option;
    this.ifSelectedAny = true;
  }

}
