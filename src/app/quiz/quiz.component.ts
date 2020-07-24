import { Component, OnInit, OnDestroy, HostListener, ElementRef, Renderer2 } from '@angular/core';
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

  //this is the final quiz time-
  quizcommontime = 30;

  //selected radio button
  div: any;

  pager = {
    index: 0,
    count: 1
  };

  constructor(private quizService: ActualquizService,
              private router: Router,
              private userService: UserService,
              private elRef:ElementRef,
              private renderer: Renderer2) {

    // used in production -------------------------
    const userdetails = JSON.parse(localStorage.getItem('userdetails') || '{}');
    // ---------------------------------------------

    // used in testing -------------------------
    // const userdetails = { quizid: '5efcc78c8430663b8404f50c', username: '5f193ee6568a561974c40cf5'}
    // ---------------------------------------------
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
        element.options = this.shuffleOptions(element.options);
        this.questions.push(new Question(element._id, element.question, element.options, element.answer));
      });
      this.currentQuestion = this.questions[0];
      this.pager.count = result.quizes.length;
    },
      err => {
        if (err.status === 403) {
          console.log("403 error fetching questions");
        }
      },
      () => {
        this.ready = true;

        this.startTimerPerQuestion();

      });
  }

  startTimerPerQuestion() {
    this.startTime = new Date();
    this.endTime = new Date();
    // -------------used in production -------------------
    this.endTime.setSeconds(this.endTime.getSeconds() + this.quizcommontime);
    // ---------------------------------------------------
    // -------------used in tesing -------------------
    // this.endTime.setSeconds(this.endTime.getSeconds() + 999999);
    // ---------------------------------------------------

    // ------ timer for 30 sec
    this.ellapsedTime = '00:30';
    //---------timer
    this.timer = setInterval(() => { this.tick(); }, 1000);
    this.duration = this.parseTime(this.quizcommontime);
  }

  nextQuestion() {

    // console.log('current question id-' +this.currentQuestion.id.trim(),'current question-' +this.currentQuestion.quest.trim(),'current my answer-' + this.tempAnswer.trim(),'current your answer-' + this.currentQuestion.answer.trim(), this.getTime());

    let finishQuiz = false;
    // if any option selected
    if (this.ifSelectedAny) {
      // this.response.addResponse(new EachResponse(this.currentQuestion.id, this.tempAnswer, this.getTime(), true));
      this.response.EachResponses.push(new EachResponse(this.currentQuestion.id,this.currentQuestion.quest, this.tempAnswer, this.currentQuestion.answer, this.getTime(), true));
    } else {
      // this.response.addResponse(new EachResponse(this.currentQuestion.id, '', this.getTime(), false));
      this.response.EachResponses.push(new EachResponse(this.currentQuestion.id, this.currentQuestion.quest, '', this.currentQuestion.answer, this.getTime(), false));
    }
    this.ifSelectedAny = false;

    this.pager.index++;
    if (this.pager.index === this.pager.count) {
      // this is when all questions end
      clearInterval(this.timer);
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
      this.ellapsedTime = '00:30';
      clearInterval(this.timer);
      this.startTimerPerQuestion();
      this.currentQuestion = this.questions[this.pager.index];
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
    const totalSec = this.quizcommontime - (min * 60 + sec);
    return totalSec;
  }

  tick() {
    const now = new Date();
    // const diff = (now.getTime() - this.startTime.getTime()) / 1000;
    const diff = (this.endTime.getTime() - now.getTime()) / 1000;
    if (diff < 0 && this.pager.index !== this.pager.count) {
      // this.onSubmit();
      this.nextQuestion();
    }
    this.ellapsedTime = this.parseTime(diff);
  }

  onSelect(option: any) {
    this.tempAnswer = option;
    this.ifSelectedAny = true;
  }

  shuffleOptions(options:string[]) {
    var currentIndex = options.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = options[currentIndex];
      options[currentIndex] = options[randomIndex];
      options[randomIndex] = temporaryValue;
    }

  return options;
  }

  clickfn(no: any){

    // -----------------also working -------------------------------
    // const alllabels = this.elRef.nativeElement.querySelectorAll('[name="labels"]');
    // console.log(alllabels);
    // alllabels.forEach((element: any) => {

    //   this.renderer.addClass(element, 'radio-button-css');

    //   if (element.classList.contains('changeLbl')){
    //     this.renderer.removeClass(element, 'changeLbl');
    //   }
    // });
    // ------------------------also worked ------------------------------------
    // this.renderer.removeClass(alllabels, 'changeLbl');
    // this.renderer.addClass(alllabels, 'radio-button-css');

    // div.className.remove("radio-button-css");
    // div.className.add("changeLbl");

  // background-color: #6601d9;
  // color: white;


    if (this.div != null) {
      this.renderer.removeClass(this.div, 'changeLbl');
      this.renderer.addClass(this.div, 'radio-button-css');
    }

    this.div = this.elRef.nativeElement.querySelector('#lbl_'+ no);
    this.renderer.removeClass(this.div, 'radio-button-css');
    this.renderer.addClass(this.div, 'changeLbl');
    // console.log(div);
  }

  clearAll() {
    if (this.div != null){
      this.div.querySelector('input').checked = false;
      this.renderer.removeClass(this.div, 'changeLbl');
      this.renderer.addClass(this.div, 'radio-button-css');
      this.div = null;
    }
  }

}
