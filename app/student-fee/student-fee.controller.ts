import * as studentFeeService from "./student-fee.service";
import * as studentService from "../student/student.service";
import * as semesterFeeService from "../semester-fee/semester-fee.service";
import { createResponse } from "../common/helper/response.hepler";
import asyncHandler from "express-async-handler";
import { type Request, type Response } from "express";

export const createStudentFee = asyncHandler(
  async (req: Request, res: Response) => {
    const student =
      await studentService.getStudentByIdWithCourseAndItsSemesters(
        req.body.student
      );
    if (!student) {
      throw new Error("Student not found");
    }
    if (
      !student.course.semesters.find(
        (semester) => semester._id.toString() === req.body.semester
      )
    ) {
      throw new Error("Semester not found in student course");
    }
    const semesterDetails = await semesterFeeService.getsemesterFeeById(
      req.body.semester
    );
    if (!semesterDetails) {
      throw new Error("Semester fee not found");
    }
    const semesterFee = await semesterFeeService.getTotalSemesterFeesByCaste(
      student.course._id,
      student.category,
      semesterDetails.semesterNumber
    );
    const discount = Math.floor(student.feesDiscount / student.course.duration);
    const discountedSemesterFee = semesterFee - discount;
    req.body.totalDiscount = discount;
    req.body.totalFees = discountedSemesterFee;
    if (req.body.balanceFees > discountedSemesterFee) {
      throw new Error("Balance fees should not be more than semester fee");
    }
    if (req.body.paidAmount > discountedSemesterFee) {
      throw new Error("Paid amount exceeds semester fee");
    }
    const lastPayment = await studentFeeService.getLatestStudentFeeBySemester(
      req.body.semester,
      student._id
    );
    if (lastPayment) {
      const feesPaidTillNow =
        await studentFeeService.getTotalAmountPaidByStudentForSemester(
          req.body.semester,
          student._id
        );
      if (
        req.body.paidAmount > lastPayment.balanceFees ||
        discountedSemesterFee < feesPaidTillNow + req.body.paidAmount
      ) {
        throw new Error("Paid amount exceeds balance fees");
      }
      req.body.balanceFees =
        lastPayment.totalFees - (feesPaidTillNow + req.body.paidAmount);
    } else {
      req.body.balanceFees = discountedSemesterFee - req.body.paidAmount;
    }
    const result = await studentFeeService.createStudentFee(req.body);
    res.send(createResponse(result, "StudentFee created sucssefully"));
  }
);

export const updateStudentFee = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await studentFeeService.updateStudentFee(
      req.params.id,
      req.body
    );
    res.send(createResponse(result, "StudentFee updated sucssefully"));
  }
);

export const editStudentFee = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await studentFeeService.editStudentFee(
      req.params.id,
      req.body
    );
    res.send(createResponse(result, "StudentFee updated sucssefully"));
  }
);

export const deleteStudentFee = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await studentFeeService.deleteStudentFee(req.params.id);
    res.send(createResponse(result, "StudentFee deleted sucssefully"));
  }
);

export const getStudentFeeById = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await studentFeeService.getStudentFeeById(req.params.id);
    res.send(createResponse(result));
  }
);
export const getLatestStudentFee = asyncHandler(
  async (req: Request, res: Response) => {
    const student = req.query.student as string;
    const semester = req.query.semester as string;
    const result = await studentFeeService.getLatestStudentFeeBySemester(
      semester,
      student
    );
    res.send(createResponse(result));
  }
);

export const getAllStudentFee = asyncHandler(
  async (req: Request, res: Response) => {
    const haveBalanceFees = req.query.haveBalanceFees;
    const student = req.query.student;
    const result = await studentFeeService.getAllStudentFee({
      haveBalanceFees: String(haveBalanceFees),
      student: student?.toString(),
    });
    res.send(createResponse(result));
  }
);
