import { Types } from "mongoose";
import { ICourse } from "../course/course.dto";
import { IsemesterFee } from "../semester-fee/semester-fee.dto";
import { type IStudentFee } from "./student-fee.dto";
import StudentFeeSchema from "./student-fee.schema";
import moment from "moment";
import { IStudent } from "../student/student.dto";

export const createStudentFee = async (data: Partial<IStudentFee>) => {
  const result = await StudentFeeSchema.create({ ...data, active: true });
  return result;
};

export const updateStudentFee = async (id: string, data: IStudentFee) => {
  const result = await StudentFeeSchema.findOneAndUpdate({ _id: id }, data, {
    new: true,
  });
  return result;
};

export const editStudentFee = async (
  id: string,
  data: Partial<IStudentFee>
) => {
  const result = await StudentFeeSchema.findOneAndUpdate({ _id: id }, data);
  return result;
};

export const deleteStudentFee = async (id: string) => {
  const result = await StudentFeeSchema.deleteOne({ _id: id });
  return result;
};

export const getStudentFeeById = async (id: string) => {
  const result = await StudentFeeSchema.findById(id).lean();
  return result;
};
export const getStudentFeeByIdWithSemesterAndStudent = async (id: string) => {
  const result = await StudentFeeSchema.findById(id)
    .populate<{ student: IStudent; semester: IsemesterFee }>({
      path: "student semester",
      model: "student SemesterFee",
    })
    .lean();
  return result;
};
export const getLatestStudentFeeBySemester = async (
  semester: string,
  student: string
) => {
  const result = await StudentFeeSchema.findOne({ semester, student })
    .sort({ createdAt: -1 })
    .lean();
  return result;
};
export const getTotalAmountPaidByStudentForSemester = async (
  semester: string,
  student: string
): Promise<number> => {
  // Aggregate the total paid amount
  const result = await StudentFeeSchema.aggregate([
    // Match the documents for the given semester and student
    {
      $match: {
        semester: new Types.ObjectId(semester),
        student: new Types.ObjectId(student),
      },
    },
    // Group the results and calculate the sum of paidAmount
    {
      $group: {
        _id: null,
        totalPaid: { $sum: "$paidAmount" },
      },
    },
  ]);

  // Return the total paid amount, or 0 if no payments exist
  return result.length > 0 ? result[0].totalPaid : 0;
};
export const getAllStudentFee = async ({
  student,
  haveBalanceFees,
}: {
  student?: string;
  haveBalanceFees?: string;
}) => {
  const query: Record<string, any> = {};

  if (student) {
    query.student = student;
  }
  console.log("Balance", haveBalanceFees);
  if (haveBalanceFees === "true") {
    query.balanceFees = { $gt: 0 }; // Only fetch records where balanceFees is greater than 0
  }
  console.log("query", query);
  const result = await StudentFeeSchema.find(query)
    .populate<{ student: IStudent }>({
      path: "student",
      model: "student",
      populate: { path: "course", model: "course" }, // Populate the "course" field inside "student"
    })
    .populate<{ semester: IsemesterFee }>({
      path: "semester",
      model: "SemesterFee",
    })
    .sort({ createdAt: -1 })
    .lean();

  return result;
};

export const getAllStudentFeeWithSemsterInfo = async () => {
  const result = await StudentFeeSchema.find({})
    .populate<{ semester: IsemesterFee & { course: ICourse } }>([
      {
        path: "semester",
        populate: {
          path: "course",
        },
      },
    ])
    .lean();
  return result;
};

export const getCurrentMonthStudentFeesCount = async () => {
  const startOfMonth = moment().startOf("month").toDate();
  const endOfMonth = moment().endOf("month").toDate();
  const result = await StudentFeeSchema.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $group: {
        _id: null,
        amount: { $sum: "$paidAmount" },
      },
    },
    {
      $project: {
        _id: 0,
        amount: 1,
      },
    },
  ]);
  return result.length > 0 ? result[0].amount : 0;
};
export const getCurrentMonthStudentBalanceFeesCount = async () => {
  const startOfMonth = moment().startOf("month").toDate();
  const endOfMonth = moment().endOf("month").toDate();

  const result = await StudentFeeSchema.aggregate([
    // Filter fees created in the current month
    {
      $match: {
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    // Sort by student and createdAt in descending order to get the latest record first
    {
      $sort: { student: 1, createdAt: -1 },
    },
    // Group by student and keep only the most recent record for each student
    {
      $group: {
        _id: "$student",
        latestBalanceFees: { $first: "$balanceFees" }, // Capture the balanceFees of the latest record
      },
    },
    // Sum up the balanceFees of the latest records
    {
      $group: {
        _id: null,
        totalBalanceFees: { $sum: "$latestBalanceFees" },
      },
    },
    // Format the result to return only the total amount
    {
      $project: {
        _id: 0,
        totalBalanceFees: 1,
      },
    },
  ]);

  // Return the total balance fees or 0 if no records are found
  return result.length > 0 ? result[0].totalBalanceFees : 0;
};
