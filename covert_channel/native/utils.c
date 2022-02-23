#include "utils.h"
#include "config.h"
#include <stdlib.h>
#include <inttypes.h>

// For qsort
int comp (const void * elem1, const void * elem2)
{
    unsigned int f = *((unsigned int*)elem1);
    unsigned int s = *((unsigned int*)elem2);
    if (f > s) return  1;
    if (f < s) return -1;
    return 0;
}
