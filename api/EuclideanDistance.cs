public static class EuclideanDistance
{
    public static double Calculate(double[] vector1, double[] vector2)
    {
        if (vector1 == null || vector2 == null)
        {
            throw new ArgumentNullException("The input arrays must not be null.");
        }

        if (vector1.Length != vector2.Length)
        {
            throw new ArgumentException("The input arrays must have the same length.");
        }

        double sumOfSquares = 0;
        for (int i = 0; i < vector1.Length; i++)
        {
            double diff = vector1[i] - vector2[i];
            sumOfSquares += diff * diff;
        }

        return Math.Sqrt(sumOfSquares);
    }
}
