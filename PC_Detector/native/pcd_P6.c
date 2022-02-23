/** This code is inspired by the code of Alday et al from https://github.com/bbbrumley/portsmash
*
*   Copyright 2018-2019 Alejandro Cabrera Aldaya, Billy Bob Brumley, Sohaib ul Hassan, Cesar Pereida García and Nicola Tuveri
*
*   Licensed under the Apache License, Version 2.0 (the "License");
*   you may not use this file except in compliance with the License.
*   You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
*   Unless required by applicable law or agreed to in writing, software
*   distributed under the License is distributed on an "AS IS" BASIS,
*   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*   See the License for the specific language governing permissions and
*   limitations under the License.
**/
#define _GNU_SOURCE
#define _OPEN_THREADS
#include "pcd_P0.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <inttypes.h>
#include <assert.h>
#include <pthread.h>
#include <unistd.h>




void *spamPort0(void *vargp) {
  while(1) {
    spam_port0();
  }
  return NULL;
}

int multiThreadedSpamPort0() {
  cpu_set_t cpuset;
  pthread_t threads[PHY_CORE];

  for (int threadNumber = 0; threadNumber < PHY_CORE; threadNumber++) {
    pthread_create(&threads[threadNumber], NULL, spamPort0, NULL);
    CPU_ZERO(&cpuset);
    CPU_SET(threadNumber, &cpuset);
    pthread_setaffinity_np(threads[threadNumber], sizeof(cpuset), &cpuset);
  }
  for (int threadNumber = 0; threadNumber < PHY_CORE; threadNumber++) {
    pthread_join(threads[threadNumber], NULL);
  }
  return 1;
}

int main() {
  multiThreadedSpamPort0();
  return 1;
}
