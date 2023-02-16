public static class DamerauLevenshteinDistance
{
    private static int min(int a, int b) => a < b ? a : b;

    private static int min(int a, int b, int c) => (a = a < b ? a : b) < c ? a : c;

    public static int Calculate(string string1, string string2)
    {
        var n = string1.Length + 1;
        var m = string2.Length + 1;

        var arrayD = new int[n, m];

        for (var i = 0; i < n; i++)
        {
            arrayD[i, 0] = i;
        }

        for (var j = 0; j < m; j++)
        {
            arrayD[0, j] = j;
        }

        for (var i = 1; i < n; i++)
        {
            for (var j = 1; j < m; j++)
            {
                var cost = string1[i - 1] == string2[j - 1] ? 0 : 1;

                arrayD[i, j] = min(arrayD[i - 1, j] + 1, arrayD[i, j - 1] + 1, arrayD[i - 1, j - 1] + cost);

                if (i > 1 && j > 1
                   && string1[i - 1] == string2[j - 2]
                   && string1[i - 2] == string2[j - 1])
                {
                    arrayD[i, j] = min(arrayD[i, j],
                    arrayD[i - 2, j - 2] + cost);
                }
            }
        }

        return arrayD[n - 1, m - 1];
    }
}
