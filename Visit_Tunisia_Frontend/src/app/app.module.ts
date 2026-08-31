import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TranslocoModule } from '@jsverse/transloco';
import { VerifyEmailComponent } from './pages/verify-email/verify-email.component';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    TranslocoModule
  ],
  declarations: [
    VerifyEmailComponent
  ]
})
export class AppModule { }
