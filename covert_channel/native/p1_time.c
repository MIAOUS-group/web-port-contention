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
include "p1_time.h"
#include "config.h"

#include <stdio.h>
#include <stdlib.h>
#include <inttypes.h>
#include <assert.h>
#include <string.h>
#include <unistd.h>

int startTimings() {
  char path[100];
  for (size_t i = 0; i < 100; i++) {
    // sprintf(path, "./raw_data/timings_%zu.bin", i);
    size_t ret;
    ret = 0;
    uint64_t *timings = (uint64_t *)calloc(RECEIVER_REP, sizeof(uint64_t));
    assert(timings != NULL);
    read_timings(timings);
    FILE *fp;
    fp = fopen(path, "wb");
    //assert(fp != NULL);

    ret = fwrite(timings, sizeof(uint64_t), RECEIVER_REP, fp);
    assert(ret == RECEIVER_REP);

    fclose(fp);
    free(timings);
    sleep(1);
  }

  return 0;
}
