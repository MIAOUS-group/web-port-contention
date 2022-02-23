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
#ifndef PCD_P0_H
#define PCD_P0_H

#define PHY_CORE 4
#define SPY_NUM_TIMINGS (1<<16)

#ifndef __ASSEMBLER__
#include <stdint.h>
extern void spam_port0();
#endif

#endif
